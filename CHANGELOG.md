# Changelog

All notable changes to the Chronos-X UIDAI Project will be documented in this file.

## [0.1.0] - 2026-01-05

### Added

#### Data Pipeline (`src/data_pipeline.py`)
- **`load_and_fuse_data()`** - Main pipeline function that:
  - Loads all 3 CSV types (biometric, demographic, enrolment)
  - Normalizes dates to first-of-month using Polars
  - Aggregates data by (Pincode, Month)
  - Performs inner join to create `Master_Pulse_Table`
  - Computes normalized Pulse Vectors (Growth, Flow, Labor)
  - Exports to `output/pulse_vectors.parquet`

- **`normalize_state_names()`** - State name normalization function that handles:
  - Case variations (`ODISHA` → `Odisha`)
  - `&` vs `and` variations (`Jammu & Kashmir` → `Jammu and Kashmir`)
  - Old names (`Orissa` → `Odisha`, `Pondicherry` → `Puducherry`)
  - Typos (`West Bangal` → `West Bengal`)
  - Merged UTs (`Daman & Diu` + `Dadra & Nagar Haveli` → combined UT)

- **`STATE_NORMALIZATION_MAP`** - Comprehensive mapping of 50+ state name variations to 36 official state/UT names

- **Helper functions:**
  - `load_dataset()` - Load and concatenate CSVs by type
  - `parse_and_normalize_date()` - Parse DD-MM-YYYY and truncate to month-start
  - `aggregate_by_pincode_month()` - Group by (pincode, month) with sum aggregation
  - `fuse_datasets()` - Inner join all 3 datasets
  - `compute_pulse_vector()` - Z-score normalization for pulse signals
  - `export_to_parquet()` - Save to Parquet format

#### Analysis Scripts
- **`analyze_parquet.py`** - Script to analyze `pulse_vectors.parquet` statistics

#### Output
- **`output/pulse_vectors.parquet`** - Fused dataset with:
  - 74,829 rows
  - 19,339 unique pincodes
  - 36 states/UTs (normalized)
  - 4 months of data (Sept 2025 - Dec 2025)
  - Columns: `pincode`, `month`, `state`, `enrol_signal`, `demo_signal`, `bio_signal`, `growth_norm`, `flow_norm`, `labor_norm`

### Fixed
- **Data Quality**: Reduced state name variations from 50 to 36 official names through normalization
