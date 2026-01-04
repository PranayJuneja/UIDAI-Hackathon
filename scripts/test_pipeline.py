"""Test the data pipeline output."""
import polars as pl

df = pl.read_parquet("output/pulse_vectors.parquet")

print("=" * 50)
print("PULSE VECTORS VERIFICATION")
print("=" * 50)

print(f"\nRows: {len(df):,}")
print(f"Unique PINs: {df['pincode'].n_unique():,}")
print(f"Date range: {df['month'].min()} to {df['month'].max()}")

print("\nColumns:", df.columns)

print("\nSample Data:")
print(df.head(10))

print("\nStatistics:")
print(df.describe())
