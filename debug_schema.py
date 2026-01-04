import polars as pl
print(pl.read_parquet("data/output/pulse_vectors.parquet").schema)
