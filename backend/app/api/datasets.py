import os
import shutil
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database import get_db, Dataset
from app.config import settings
from app.schemas.schemas import DatasetResponse, ProcessDatasetRequest, ProcessingReport
from app.services.data_processor import DataProcessor

logger = logging.getLogger("mlops.api.datasets")
router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Uploads a CSV dataset, profiles features, and stores metadata in PostgreSQL/SQLite."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported."
        )

    # Save uploaded file
    safe_filename = f"{int(os.times().elapsed)}_{file.filename}"
    saved_path = str(settings.DATASETS_DIR / safe_filename)
    
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        inspection = DataProcessor.inspect_csv(saved_path)
    except Exception as e:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse and inspect CSV: {str(e)}"
        )

    dataset_record = Dataset(
        filename=safe_filename,
        original_name=file.filename,
        row_count=inspection["row_count"],
        column_count=inspection["column_count"],
        columns_json=json.dumps(inspection["columns"]),
        summary_stats_json=json.dumps({
            "duplicates_count": inspection["duplicates_count"],
            "total_missing": inspection["total_missing"]
        }),
        target_column=target_column,
        file_path=saved_path,
        is_cleaned=False
    )
    db.add(dataset_record)
    db.commit()
    db.refresh(dataset_record)

    return DatasetResponse(
        id=dataset_record.id,
        filename=dataset_record.filename,
        original_name=dataset_record.original_name,
        row_count=dataset_record.row_count,
        column_count=dataset_record.column_count,
        columns=inspection["columns"],
        target_column=dataset_record.target_column,
        is_cleaned=dataset_record.is_cleaned,
        cleaning_report=None,
        preview=inspection["preview"],
        created_at=dataset_record.created_at
    )

@router.get("", response_model=List[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    """List all registered datasets."""
    datasets = db.query(Dataset).order_by(Dataset.id.desc()).all()
    results = []
    for d in datasets:
        cols = json.loads(d.columns_json or "[]")
        clean_rep = json.loads(d.cleaning_report_json or "{}") if d.cleaning_report_json else None
        results.append(DatasetResponse(
            id=d.id,
            filename=d.filename,
            original_name=d.original_name,
            row_count=d.row_count,
            column_count=d.column_count,
            columns=cols,
            target_column=d.target_column,
            is_cleaned=d.is_cleaned,
            cleaning_report=clean_rep,
            preview=None,
            created_at=d.created_at
        ))
    return results

@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Get single dataset details with preview rows."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    preview = None
    if os.path.exists(dataset.file_path):
        try:
            inspection = DataProcessor.inspect_csv(dataset.file_path)
            preview = inspection["preview"]
        except Exception:
            pass

    return DatasetResponse(
        id=dataset.id,
        filename=dataset.filename,
        original_name=dataset.original_name,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        columns=json.loads(dataset.columns_json or "[]"),
        target_column=dataset.target_column,
        is_cleaned=dataset.is_cleaned,
        cleaning_report=json.loads(dataset.cleaning_report_json or "{}") if dataset.cleaning_report_json else None,
        preview=preview,
        created_at=dataset.created_at
    )

@router.post("/{dataset_id}/process", response_model=DatasetResponse)
def process_dataset(
    dataset_id: int,
    request: ProcessDatasetRequest,
    db: Session = Depends(get_db)
):
    """
    Cleans dataset:
    - Missing numerical -> median
    - Missing categorical -> mode
    - Remove duplicates
    - Outlier clipping
    - Categorical encoding
    - Saves baseline distribution for drift detection
    """
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    target = request.target_column or dataset.target_column

    try:
        cleaned_path, report, preprocessor_dict, baseline_dist = DataProcessor.clean_and_prepare(
            raw_file_path=dataset.file_path,
            target_column=target,
            scale_numerical=request.scale_numerical,
            handle_outliers=request.handle_outliers
        )
    except Exception as e:
        logger.error(f"Data cleaning failed: {e}")
        raise HTTPException(status_code=400, detail=f"Data cleaning failed: {str(e)}")

    # Update database record
    dataset.cleaned_path = cleaned_path
    dataset.is_cleaned = True
    dataset.target_column = report.get("target_column")
    dataset.cleaning_report_json = json.dumps(report)
    db.commit()
    db.refresh(dataset)

    # Get updated preview
    inspection = DataProcessor.inspect_csv(cleaned_path)

    return DatasetResponse(
        id=dataset.id,
        filename=dataset.filename,
        original_name=dataset.original_name,
        row_count=inspection["row_count"],
        column_count=inspection["column_count"],
        columns=inspection["columns"],
        target_column=dataset.target_column,
        is_cleaned=True,
        cleaning_report=report,
        preview=inspection["preview"],
        created_at=dataset.created_at
    )

@router.post("/load-sample/{sample_name}", response_model=DatasetResponse)
def load_sample_dataset(sample_name: str = "churn", db: Session = Depends(get_db)):
    """Loads a pre-generated sample dataset for 1-click quick college demo."""
    sample_file_map = {
        "churn": "sample-data/sample_classification.csv",
        "iris": "sample-data/iris.csv"
    }

    target_map = {
        "churn": "churn",
        "iris": "species"
    }

    sample_path = sample_file_map.get(sample_name)
    if not sample_path or not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail=f"Sample dataset '{sample_name}' not found.")

    target_col = target_map.get(sample_name)
    dest_filename = f"sample_{sample_name}_{int(os.times().elapsed)}.csv"
    dest_path = str(settings.DATASETS_DIR / dest_filename)
    shutil.copyfile(sample_path, dest_path)

    inspection = DataProcessor.inspect_csv(dest_path)

    dataset_record = Dataset(
        filename=dest_filename,
        original_name=os.path.basename(sample_path),
        row_count=inspection["row_count"],
        column_count=inspection["column_count"],
        columns_json=json.dumps(inspection["columns"]),
        summary_stats_json=json.dumps({
            "duplicates_count": inspection["duplicates_count"],
            "total_missing": inspection["total_missing"]
        }),
        target_column=target_col,
        file_path=dest_path,
        is_cleaned=False
    )
    db.add(dataset_record)
    db.commit()
    db.refresh(dataset_record)

    return DatasetResponse(
        id=dataset_record.id,
        filename=dataset_record.filename,
        original_name=dataset_record.original_name,
        row_count=dataset_record.row_count,
        column_count=dataset_record.column_count,
        columns=inspection["columns"],
        target_column=dataset_record.target_column,
        is_cleaned=False,
        cleaning_report=None,
        preview=inspection["preview"],
        created_at=dataset_record.created_at
    )
