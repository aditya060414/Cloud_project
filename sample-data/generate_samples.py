import numpy as np
import pandas as pd
from sklearn.datasets import load_iris
import os

os.makedirs("sample-data", exist_ok=True)

# 1. Customer Churn Dataset (realistic binary classification with 1000 rows)
np.random.seed(42)
n_samples = 1000

age = np.random.randint(20, 72, size=n_samples)
annual_income = np.random.normal(55000, 18000, size=n_samples).clip(20000, 150000).astype(int)
credit_score = np.random.normal(680, 70, size=n_samples).clip(450, 850).astype(int)
tenure_months = np.random.randint(1, 60, size=n_samples)
monthly_charges = np.random.normal(65, 20, size=n_samples).clip(20, 120).round(2)
total_transactions = (tenure_months * np.random.uniform(1.5, 4.0, size=n_samples)).astype(int)
contract_choices = ['Month-to-Month', 'One-Year', 'Two-Year']
contract_type = np.random.choice(contract_choices, size=n_samples, p=[0.55, 0.25, 0.20])
support_tickets = np.random.poisson(lam=1.5, size=n_samples).clip(0, 10)

# Calculate realistic churn probability
# Higher charges, month-to-month, more support tickets, low tenure -> higher churn
z = (
    0.03 * (monthly_charges - 60)
    - 0.05 * (tenure_months - 25)
    + 0.6 * (support_tickets - 1.5)
    + (contract_type == 'Month-to-Month') * 0.9
    - (contract_type == 'Two-Year') * 1.2
    - 0.00002 * (annual_income - 50000)
    - 0.005 * (credit_score - 650)
)
prob = 1 / (1 + np.exp(-z))
churn = (np.random.uniform(0, 1, size=n_samples) < prob).astype(int)

# Inject a few missing values and a couple of duplicates to demonstrate cleaning capability
df_churn = pd.DataFrame({
    'age': age,
    'annual_income': annual_income,
    'credit_score': credit_score,
    'tenure_months': tenure_months,
    'monthly_charges': monthly_charges,
    'total_transactions': total_transactions,
    'contract_type': contract_type,
    'support_tickets': support_tickets,
    'churn': churn
})

# Insert ~15 missing values in numerical and categorical
missing_idx_income = np.random.choice(n_samples, size=8, replace=False)
df_churn.loc[missing_idx_income, 'annual_income'] = np.nan

missing_idx_contract = np.random.choice(n_samples, size=5, replace=False)
df_churn.loc[missing_idx_contract, 'contract_type'] = np.nan

# Insert 4 duplicate rows
duplicates = df_churn.iloc[:4].copy()
df_churn = pd.concat([df_churn, duplicates], ignore_index=True)

churn_path = "sample-data/sample_classification.csv"
df_churn.to_csv(churn_path, index=False)
print(f"Generated {churn_path} with {len(df_churn)} rows.")

# 2. Iris dataset
iris = load_iris(as_frame=True)
df_iris = iris.frame
# Rename target to species_name or target
df_iris['species'] = df_iris['target'].map({0: 'setosa', 1: 'versicolor', 2: 'virginica'})
df_iris = df_iris.drop(columns=['target'])
iris_path = "sample-data/iris.csv"
df_iris.to_csv(iris_path, index=False)
print(f"Generated {iris_path} with {len(df_iris)} rows.")
