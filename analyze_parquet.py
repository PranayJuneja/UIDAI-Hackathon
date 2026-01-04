import polars as pl

df = pl.read_parquet(r"D:\Antigravity Projects\UIDAI Project\output\pulse_vectors.parquet")

print(f"Rows: {len(df)}")
print(f"PINs: {df['pincode'].n_unique()}")
print(f"Cols: {df.columns}")
print(f"Date Range: {df['month'].min()} to {df['month'].max()}")
print(f"Months: {df['month'].n_unique()}")
print(f"\nStates: {df['state'].n_unique()}")
print("\nTop States:")
for row in df.group_by("state").len().sort("len", descending=True).head(5).iter_rows():
    print(f"  {row[0]}: {row[1]}")
print("\nSignal Stats:")
print(df.select(["enrol_signal", "demo_signal", "bio_signal"]).describe())
print("\nNormalized Stats:")
print(df.select(["growth_norm", "flow_norm", "labor_norm"]).describe())
print("\nSample:")
print(df.head(3))
