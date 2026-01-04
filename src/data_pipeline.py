"""
Chronos-X Data Pipeline
========================
Fuses Biometric, Demographic, and Enrolment data into a unified Pulse Vector table.

Author: Chronos-X Team
Date: January 2026
"""

import polars as pl
import glob
import os
from pathlib import Path


# Configuration
BASE_DIR = Path(r"D:\Antigravity Projects\UIDAI Project")
OUTPUT_DIR = BASE_DIR / "data/output"

DATA_PATHS = {
    "biometric": BASE_DIR / "data/api_data_aadhar_biometric",
    "demographic": BASE_DIR / "data/api_data_aadhar_demographic", 
    "enrolment": BASE_DIR / "data/api_data_aadhar_enrolment",
}

# Column mappings for each dataset type
COLUMN_CONFIG = {
    "biometric": {
        "value_col": "bio_age_17_",  # Adult biometric updates (labor signal)
        "prefix": "bio"
    },
    "demographic": {
        "value_col": "demo_age_17_",  # Adult demographic updates (migration signal)
        "prefix": "demo"
    },
    "enrolment": {
        "value_col": "age_0_5",  # Child enrolments (growth signal)
        "prefix": "enrol"
    }
}

# State name normalization mapping (handles variations, typos, old names)
STATE_NORMALIZATION_MAP = {
    # Andaman & Nicobar variations
    "andaman & nicobar islands": "Andaman and Nicobar Islands",
    "andaman and nicobar islands": "Andaman and Nicobar Islands",
    
    # Dadra & Nagar Haveli variations (now merged with Daman & Diu)
    "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    
    # Daman & Diu variations (now merged)
    "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
    "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    
    # Jammu & Kashmir variations
    "jammu & kashmir": "Jammu and Kashmir",
    "jammu and kashmir": "Jammu and Kashmir",
    
    # Odisha variations (old name: Orissa)
    "odisha": "Odisha",
    "orissa": "Odisha",
    
    # Puducherry variations (old name: Pondicherry)
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    
    # West Bengal variations (typos and case issues)
    "west bengal": "West Bengal",
    "west  bengal": "West Bengal",  # Double space
    "west bangal": "West Bengal",   # Typo
    "westbengal": "West Bengal",    # No space
    
    # Standard states (lowercase mapping)
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar",
    "chandigarh": "Chandigarh",
    "chhattisgarh": "Chhattisgarh",
    "delhi": "Delhi",
    "goa": "Goa",
    "gujarat": "Gujarat",
    "haryana": "Haryana",
    "himachal pradesh": "Himachal Pradesh",
    "jharkhand": "Jharkhand",
    "karnataka": "Karnataka",
    "kerala": "Kerala",
    "ladakh": "Ladakh",
    "lakshadweep": "Lakshadweep",
    "madhya pradesh": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "punjab": "Punjab",
    "rajasthan": "Rajasthan",
    "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu",
    "telangana": "Telangana",
    "tripura": "Tripura",
    "uttar pradesh": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand",
}


def normalize_state_names(df: pl.DataFrame) -> pl.DataFrame:
    """
    Normalize state names to official current names.
    
    Handles:
    - Case variations (ODISHA -> Odisha)
    - & vs 'and' variations
    - Old names (Orissa -> Odisha, Pondicherry -> Puducherry)
    - Typos (West Bangal -> West Bengal)
    - Merged UTs (Daman & Diu + Dadra & Nagar Haveli)
    """
    if "state" not in df.columns:
        return df
    
    # Create a lookup expression
    def normalize_state(state_val):
        if state_val is None:
            return None
        # Normalize: lowercase, strip whitespace, collapse multiple spaces
        normalized = " ".join(str(state_val).lower().strip().split())
        return STATE_NORMALIZATION_MAP.get(normalized, state_val)
    
    # Apply normalization using map_elements
    df = df.with_columns(
        pl.col("state").map_elements(normalize_state, return_dtype=pl.Utf8).alias("state")
    )
    
    return df


def load_dataset(dataset_type: str) -> pl.DataFrame:
    """
    Load all CSV files for a given dataset type.
    
    Args:
        dataset_type: One of 'biometric', 'demographic', 'enrolment'
    
    Returns:
        Combined DataFrame with all rows from all files
    """
    data_path = DATA_PATHS[dataset_type]
    csv_pattern = str(data_path / "*.csv")
    csv_files = glob.glob(csv_pattern)
    
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {data_path}")
    
    print(f"[{dataset_type.upper()}] Loading {len(csv_files)} files...")
    
    # Load and concatenate all CSVs
    dfs = []
    for f in csv_files:
        df = pl.read_csv(f, ignore_errors=True)
        dfs.append(df)
        print(f"  ├─ {os.path.basename(f)}: {len(df):,} rows")
    
    combined = pl.concat(dfs)
    print(f"  └─ Total: {len(combined):,} rows")
    
    return combined


def parse_and_normalize_date(df: pl.DataFrame) -> pl.DataFrame:
    """
    Parse date column and normalize to first-of-month.
    
    Expected format: DD-MM-YYYY (e.g., 07-11-2025)
    """
    if "date" not in df.columns:
        raise ValueError("DataFrame missing 'date' column")
    
    # Parse date string to Date type
    df = df.with_columns(
        pl.col("date").str.strptime(pl.Date, "%d-%m-%Y").alias("date_parsed")
    )
    
    # Truncate to first day of month
    df = df.with_columns(
        pl.col("date_parsed").dt.truncate("1mo").alias("month")
    )
    
    return df


def aggregate_by_pincode_month(df: pl.DataFrame, config: dict) -> pl.DataFrame:
    """
    Aggregate data by (pincode, month) and extract the relevant signal column.
    
    Args:
        df: DataFrame with parsed dates
        config: Column configuration for this dataset type
    
    Returns:
        Aggregated DataFrame with columns: pincode, month, state, <signal>
    """
    value_col = config["value_col"]
    prefix = config["prefix"]
    
    if value_col not in df.columns:
        raise ValueError(f"Expected column '{value_col}' not found. Available: {df.columns}")
    
    # Group by pincode and month, sum the value column
    agg_df = df.group_by(["pincode", "month"]).agg([
        pl.col(value_col).sum().alias(f"{prefix}_signal"),
        pl.col("state").first().alias("state"),  # Keep state for reference
    ])
    
    return agg_df


def fuse_datasets(bio_df: pl.DataFrame, demo_df: pl.DataFrame, 
                  enrol_df: pl.DataFrame) -> pl.DataFrame:
    """
    Perform inner join on all 3 datasets to create Master Pulse Table.
    
    Join key: (pincode, month)
    """
    print("\n[FUSION] Joining datasets...")
    
    # Join 1: Biometric + Demographic
    join1 = bio_df.join(demo_df, on=["pincode", "month"], how="inner", suffix="_demo")
    print(f"  ├─ Bio + Demo: {len(join1):,} rows")
    
    # Join 2: + Enrolment
    master = join1.join(enrol_df, on=["pincode", "month"], how="inner", suffix="_enrol")
    print(f"  └─ + Enrolment: {len(master):,} rows")
    
    return master


def compute_pulse_vector(df: pl.DataFrame) -> pl.DataFrame:
    """
    Compute normalized Pulse Vector for each (pincode, month).
    
    The Pulse Vector V = [Growth, Flow, Labor] where:
    - Growth = Normalized child enrolment (settling families)
    - Flow = Normalized adult demographic updates (migration)
    - Labor = Normalized adult biometric updates (manual work intensity)
    """
    print("\n[PULSE] Computing normalized vectors...")
    
    # Calculate global statistics for normalization
    stats = {
        "enrol_mean": df["enrol_signal"].mean(),
        "enrol_std": df["enrol_signal"].std(),
        "demo_mean": df["demo_signal"].mean(),
        "demo_std": df["demo_signal"].std(),
        "bio_mean": df["bio_signal"].mean(),
        "bio_std": df["bio_signal"].std(),
    }
    
    # Z-score normalization
    df = df.with_columns([
        ((pl.col("enrol_signal") - stats["enrol_mean"]) / stats["enrol_std"]).alias("growth_norm"),
        ((pl.col("demo_signal") - stats["demo_mean"]) / stats["demo_std"]).alias("flow_norm"),
        ((pl.col("bio_signal") - stats["bio_mean"]) / stats["bio_std"]).alias("labor_norm"),
    ])
    
    # Handle NaN (from 0 std) by filling with 0
    df = df.with_columns([
        pl.col("growth_norm").fill_nan(0.0),
        pl.col("flow_norm").fill_nan(0.0),
        pl.col("labor_norm").fill_nan(0.0),
    ])
    
    print(f"  ├─ Stats: enrol μ={stats['enrol_mean']:.2f}, demo μ={stats['demo_mean']:.2f}, bio μ={stats['bio_mean']:.2f}")
    print(f"  └─ Normalized {len(df):,} pulse vectors")
    
    return df


def load_and_fuse_data() -> pl.DataFrame:
    """
    Main pipeline function: Load, process, fuse, and export all data.
    
    Returns:
        Master Pulse Table as Polars DataFrame
    """
    print("=" * 60)
    print("CHRONOS-X DATA PIPELINE")
    print("=" * 60)
    
    # Step 1: Load all datasets
    bio_raw = load_dataset("biometric")
    demo_raw = load_dataset("demographic")
    enrol_raw = load_dataset("enrolment")
    
    # Step 1.5: Normalize state names
    print("\n[STATE] Normalizing state names...")
    bio_raw = normalize_state_names(bio_raw)
    demo_raw = normalize_state_names(demo_raw)
    enrol_raw = normalize_state_names(enrol_raw)
    print(f"  └─ Unique states after normalization: {bio_raw['state'].n_unique()}")
    
    # Step 2: Parse and normalize dates
    print("\n[DATE] Normalizing dates to month-start...")
    bio_dated = parse_and_normalize_date(bio_raw)
    demo_dated = parse_and_normalize_date(demo_raw)
    enrol_dated = parse_and_normalize_date(enrol_raw)
    
    # Step 3: Aggregate by (pincode, month)
    print("\n[AGG] Aggregating by (pincode, month)...")
    bio_agg = aggregate_by_pincode_month(bio_dated, COLUMN_CONFIG["biometric"])
    demo_agg = aggregate_by_pincode_month(demo_dated, COLUMN_CONFIG["demographic"])
    enrol_agg = aggregate_by_pincode_month(enrol_dated, COLUMN_CONFIG["enrolment"])
    
    print(f"  ├─ Biometric: {len(bio_agg):,} (pincode, month) pairs")
    print(f"  ├─ Demographic: {len(demo_agg):,} (pincode, month) pairs")
    print(f"  └─ Enrolment: {len(enrol_agg):,} (pincode, month) pairs")
    
    # Step 4: Fuse datasets
    master = fuse_datasets(bio_agg, demo_agg, enrol_agg)
    
    # Step 5: Compute normalized pulse vectors
    master = compute_pulse_vector(master)
    
    # Step 6: Clean up columns (remove duplicates from joins)
    final_columns = [
        "pincode", "month", "state",
        "enrol_signal", "demo_signal", "bio_signal",  # Raw signals
        "growth_norm", "flow_norm", "labor_norm"       # Normalized pulse vector
    ]
    master = master.select([c for c in final_columns if c in master.columns])
    
    return master


def export_to_parquet(df: pl.DataFrame, filename: str = "pulse_vectors.parquet"):
    """
    Export the Master Pulse Table to Parquet format.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = OUTPUT_DIR / filename
    
    df.write_parquet(output_path)
    print(f"\n[EXPORT] Saved to {output_path}")
    print(f"  └─ Size: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")


def main():
    """
    Run the full data pipeline.
    """
    # Load and fuse
    master_pulse_table = load_and_fuse_data()
    
    # Export
    export_to_parquet(master_pulse_table)
    
    # Summary
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    print(f"Total unique pincodes: {master_pulse_table['pincode'].n_unique():,}")
    print(f"Date range: {master_pulse_table['month'].min()} to {master_pulse_table['month'].max()}")
    print(f"Total rows: {len(master_pulse_table):,}")
    
    # Show sample
    print("\nSample Pulse Vectors:")
    print(master_pulse_table.head(5))
    
    return master_pulse_table


if __name__ == "__main__":
    master = main()
