import os
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List, Optional
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib

from app.config import settings

logger = logging.getLogger("mlops.data_processor")

class DataProcessor:
    """Handles data validation, profiling, cleaning, transformation, and baseline extraction."""

    @staticmethod
    def inspect_csv(file_path: str) -> Dict[str, Any]:
        """Reads CSV and returns column stats, row counts, missing values, duplicates, and preview."""
        df = pd.read_csv(file_path)
        row_count, col_count = df.shape

        columns_info = []
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            null_count = int(df[col].isnull().sum())
            unique_count = int(df[col].nunique())
            # Clean sample values for JSON serialization
            non_nulls = df[col].dropna()
            samples = non_nulls.head(3).tolist() if len(non_nulls) > 0 else []
            clean_samples = [int(x) if isinstance(x, (np.integer, int)) else (float(x) if isinstance(x, (np.floating, float)) else str(x)) for x in samples]
            
            columns_info.append({
                "name": str(col),
                "dtype": dtype_str,
                "null_count": null_count,
                "unique_count": unique_count,
                "sample_values": clean_samples
            })

        duplicates_count = int(df.duplicated().sum())
        total_missing = int(df.isnull().sum().sum())

        # Clean preview for JSON response (first 5 rows)
        preview_records = []
        for _, row in df.head(5).iterrows():
            clean_row = {}
            for k, v in row.items():
                if pd.isna(v):
                    clean_row[k] = None
                elif isinstance(v, (np.integer, int)):
                    clean_row[k] = int(v)
                elif isinstance(v, (np.floating, float)):
                    clean_row[k] = round(float(v), 4)
                else:
                    clean_row[k] = str(v)
            preview_records.append(clean_row)

        return {
            "row_count": row_count,
            "column_count": col_count,
            "columns": columns_info,
            "duplicates_count": duplicates_count,
            "total_missing": total_missing,
            "preview": preview_records
        }

    @staticmethod
    def clean_and_prepare(
        raw_file_path: str,
        target_column: Optional[str] = None,
        scale_numerical: bool = True,
        handle_outliers: bool = True
    ) -> Tuple[str, Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
        """
        Cleans dataset:
        1. Remove duplicates
        2. Impute missing values (median for numerical, mode for categorical)
        3. Handle outliers with IQR clipping
        4. Encode categorical features and target
        5. Build fitted preprocessor dictionary for inference pipeline
        6. Compute baseline distribution per feature for drift detection
        """
        df = pd.read_csv(raw_file_path)
        before_rows = len(df)
        initial_missing = int(df.isnull().sum().sum())
        initial_duplicates = int(df.duplicated().sum())

        transformations: List[str] = []

        # 1. Remove Duplicates
        if initial_duplicates > 0:
            df = df.drop_duplicates().reset_index(drop=True)
            transformations.append(f"Removed {initial_duplicates} duplicate rows")

        # Guess target if not provided
        if not target_column:
            if 'churn' in df.columns:
                target_column = 'churn'
            elif 'species' in df.columns:
                target_column = 'species'
            elif 'target' in df.columns:
                target_column = 'target'
            else:
                target_column = df.columns[-1]

        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset columns.")

        # Separate target
        y_raw = df[target_column].copy()
        X_df = df.drop(columns=[target_column]).copy()

        # Identify numerical vs categorical
        num_cols = X_df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = X_df.select_dtypes(exclude=[np.number]).columns.tolist()

        preprocessor_dict = {
            "numerical_cols": num_cols,
            "categorical_cols": cat_cols,
            "target_col": target_column,
            "num_imputers": {},
            "cat_imputers": {},
            "cat_encoders": {},
            "target_encoder": None,
            "scaler": None,
            "feature_names": [],
            "iqr_bounds": {}
        }

        # 2. Impute Numerical Columns (Median)
        for col in num_cols:
            median_val = float(X_df[col].median(skipna=True))
            if pd.isna(median_val):
                median_val = 0.0
            preprocessor_dict["num_imputers"][col] = median_val
            missing_count = int(X_df[col].isnull().sum())
            if missing_count > 0:
                X_df[col] = X_df[col].fillna(median_val)
                transformations.append(f"Imputed {missing_count} missing values in '{col}' using median ({median_val:.2f})")

        # 3. Impute Categorical Columns (Mode)
        for col in cat_cols:
            mode_series = X_df[col].mode(dropna=True)
            mode_val = str(mode_series.iloc[0]) if len(mode_series) > 0 else "Unknown"
            preprocessor_dict["cat_imputers"][col] = mode_val
            missing_count = int(X_df[col].isnull().sum())
            if missing_count > 0:
                X_df[col] = X_df[col].fillna(mode_val)
                transformations.append(f"Imputed {missing_count} missing values in '{col}' using mode ('{mode_val}')")

        # 4. Outlier Handling (IQR clipping for numerical features)
        if handle_outliers:
            for col in num_cols:
                q25 = float(X_df[col].quantile(0.25))
                q75 = float(X_df[col].quantile(0.75))
                iqr = q75 - q25
                lower_bound = q25 - 2.5 * iqr
                upper_bound = q75 + 2.5 * iqr
                preprocessor_dict["iqr_bounds"][col] = {"lower": lower_bound, "upper": upper_bound}
                outliers_low = (X_df[col] < lower_bound).sum()
                outliers_high = (X_df[col] > upper_bound).sum()
                if (outliers_low + outliers_high) > 0:
                    X_df[col] = X_df[col].clip(lower=lower_bound, upper=upper_bound)
                    transformations.append(f"Clipped {outliers_low + outliers_high} extreme outliers in '{col}' to IQR [ {lower_bound:.1f}, {upper_bound:.1f} ]")

        # 5. Categorical Encoding
        for col in cat_cols:
            le = LabelEncoder()
            X_df[col] = le.fit_transform(X_df[col].astype(str))
            # Store mapping
            mapping = {str(cls_): int(idx) for idx, cls_ in enumerate(le.classes_)}
            preprocessor_dict["cat_encoders"][col] = {
                "classes": [str(c) for c in le.classes_],
                "mapping": mapping
            }
            transformations.append(f"Encoded categorical feature '{col}' with {len(le.classes_)} classes")

        # 6. Encode Target
        target_encoder_info = {}
        if y_raw.dtype == object or str(y_raw.dtype) == 'category' or isinstance(y_raw.iloc[0], str):
            le_target = LabelEncoder()
            y_clean = le_target.fit_transform(y_raw.astype(str))
            target_classes = [str(c) for c in le_target.classes_]
            target_encoder_info = {
                "is_encoded": True,
                "classes": target_classes,
                "mapping": {str(cls_): int(idx) for idx, cls_ in enumerate(le_target.classes_)}
            }
            transformations.append(f"Encoded target '{target_column}' classes: {target_classes}")
        else:
            # Target is already numeric
            y_clean = y_raw.fillna(y_raw.mode()[0]).astype(int).values
            target_classes = sorted([int(x) for x in np.unique(y_clean)])
            target_encoder_info = {
                "is_encoded": False,
                "classes": target_classes,
                "mapping": {str(x): int(x) for x in target_classes}
            }

        preprocessor_dict["target_encoder"] = target_encoder_info
        preprocessor_dict["feature_names"] = list(X_df.columns)

        # Baseline Feature Distribution for Drift Detection
        baseline_distribution = {}
        for col in X_df.columns:
            series = X_df[col]
            # 10 bins for numerical distribution histogram
            counts, bin_edges = np.histogram(series, bins=10)
            baseline_distribution[col] = {
                "mean": float(series.mean()),
                "std": float(series.std()) if len(series) > 1 else 0.0,
                "min": float(series.min()),
                "max": float(series.max()),
                "quantiles": [float(series.quantile(q)) for q in [0.1, 0.25, 0.5, 0.75, 0.9]],
                "bin_edges": [float(b) for b in bin_edges],
                "hist_counts": [int(c) for c in counts],
                "total_count": int(len(series))
            }

        # Combine cleaned X and target y into cleaned DataFrame
        df_cleaned = X_df.copy()
        df_cleaned[target_column] = y_clean

        # Save cleaned dataset
        base_name = os.path.splitext(os.path.basename(raw_file_path))[0]
        cleaned_file_path = str(settings.DATASETS_DIR / f"{base_name}_cleaned.csv")
        df_cleaned.to_csv(cleaned_file_path, index=False)

        # Save preprocessor artifact
        preprocessor_file_path = str(settings.ARTIFACTS_DIR / f"{base_name}_preprocessor.joblib")
        joblib.dump(preprocessor_dict, preprocessor_file_path)

        after_rows = len(df_cleaned)
        cleaning_report = {
            "before_rows": before_rows,
            "after_rows": after_rows,
            "missing_values_handled": initial_missing,
            "duplicates_removed": initial_duplicates,
            "transformations": transformations,
            "features_processed": list(X_df.columns),
            "target_column": target_column,
            "target_classes": target_classes,
            "preprocessor_path": preprocessor_file_path
        }

        logger.info(f"Cleaned dataset saved at {cleaned_file_path}. Rows: {before_rows} -> {after_rows}")
        return cleaned_file_path, cleaning_report, preprocessor_dict, baseline_distribution
