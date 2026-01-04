
import polars as pl
import os

def analyze():
    base_dir = r"d:\Antigravity Projects\UIDAI Project"
    
    # Specific files with known overlapping dates (Nov-Dec 2025)
    files = {
        "Biometric": os.path.join(base_dir, "api_data_aadhar_biometric", "api_data_aadhar_biometric_1000000_1500000.csv"),
        "Enrolment": os.path.join(base_dir, "api_data_aadhar_enrolment", "api_data_aadhar_enrolment_500000_1000000.csv"),
        "Demographic": os.path.join(base_dir, "api_data_aadhar_demographic", "api_data_aadhar_demographic_0_500000.csv")
    }

    dfs = {}
    
    output_file = "feasibility_result.txt"
    
    with open(output_file, "w", encoding="utf-8") as f_out:
        
        for name, path in files.items():
            f_out.write(f"Loading {name} from {os.path.basename(path)}...\n")
            try:
                df = pl.read_csv(path, ignore_errors=True)
                
                # Date Parsing
                if "date" in df.columns:
                    try:
                        df = df.with_columns(
                            pl.col("date").str.strptime(pl.Date, "%d-%m-%Y")
                        )
                    except:
                        # Fallback or auto
                        df = df.with_columns(pl.col("date").str.to_date())
                    
                    # Truncate to Month
                    df = df.with_columns(
                        pl.col("date").dt.truncate("1mo").alias("month")
                    )
                
                # Aggregate
                # Value cols: exclude keys
                keys = ["pincode", "month"]
                exclude = ["date", "state", "district", "pincode", "month"]
                value_cols = [c for c in df.columns if c not in exclude]
                
                agg_df = df.group_by(keys).agg([pl.col(c).sum() for c in value_cols])
                dfs[name] = agg_df
                f_out.write(f"  Rows: {len(agg_df)}\n")
                
            except Exception as e:
                f_out.write(f"  Error: {e}\n")
                return

        # Join
        f_out.write("-" * 30 + "\n")
        
        # 1. Bio + Enrol (Since these are effectively sorted/partitioned by date, this is the critical join)
        # Note: Enrol 500k-1m is Oct-Dec. Bio 1m-1.5m is Nov-Dec. Overlap should be Nov-Dec.
        join1 = dfs["Biometric"].join(dfs["Enrolment"], on=["pincode", "month"], how="inner")
        f_out.write(f"Join Bio + Enrol: {len(join1)} rows\n")
        
        # 2. + Demo (Demo 0-500k is Mar-Dec, so should contain Nov-Dec data)
        join2 = join1.join(dfs["Demographic"], on=["pincode", "month"], how="inner")
        f_out.write(f"Join Bio + Enrol + Demo: {len(join2)} rows\n")
        
        if len(join2) > 0:
            f_out.write("\nSUCCESS: Feasibility Confirmed.\n")
            f_out.write(f"Common Pincodes: {join2['pincode'].n_unique()}\n")
            f_out.write(f"Date Range: {join2['month'].min()} to {join2['month'].max()}\n")
        else:
            f_out.write("\nFAILURE: No common keys found.\n")

if __name__ == "__main__":
    analyze()
