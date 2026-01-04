
import polars as pl
import glob
import os

def analyze():
    base_dir = r"d:\Antigravity Projects\UIDAI Project"
    
    # Paths (using glob patterns)
    path_patterns = {
        "Biometric": os.path.join(base_dir, "api_data_aadhar_biometric", "*.csv"),
        "Demographic": os.path.join(base_dir, "api_data_aadhar_demographic", "*.csv"),
        "Enrolment": os.path.join(base_dir, "api_data_aadhar_enrolment", "*.csv")
    }

    dfs = {}
    
    for name, pattern in path_patterns.items():
        files = glob.glob(pattern)
        if not files:
            print(f"ERROR: No files found for {name} with pattern {pattern}")
            return
        
        # Load sample (first file)
        # Using the file with likely more data or just the first one. 
        # The file system listing showed files like '...1000000_1500000.csv'. 
        # We'll just pick the first one found by glob.
        sample_file = files[0]
        print(f"Loading {name} sample from: {os.path.basename(sample_file)}")
        
        try:
            # Read CSV
            df = pl.read_csv(sample_file)
            
            # Check for columns
            print(f"  Columns: {df.columns}")
            
            # Date Parsing
            # Date format seen in view_file: 07-11-2025 (dd-mm-yyyy)
            if "date" in df.columns:
                # Custom Parsing because Polars auto-detect might fail or be slow
                try:
                    df = df.with_columns(
                        pl.col("date").str.strptime(pl.Date, "%d-%m-%Y")
                    )
                except Exception as e:
                    print(f"  Date parsing failed with %d-%m-%Y, trying auto: {e}")
                    df = df.with_columns(
                         pl.col("date").str.to_date() # try auto
                    )
                
                # Create Month Column (First day of month)
                df = df.with_columns(
                    pl.col("date").dt.truncate("1mo").alias("month")
                )
            else:
                print(f"  WARNING: 'date' column missing in {name}")
                return

            # Aggregate by Month + Pincode
            # Determine value columns (exclude date, state, district, pincode, month)
            keys = ["pincode", "month"]
            # Exclude non-numeric or key columns
            exclude = ["date", "state", "district", "pincode", "month"]
            value_cols = [c for c in df.columns if c not in exclude]
            
            print(f"  Value Columns to Agg: {value_cols}")
            
            # GroupBy and Sum
            # Filter valid pincodes if numeric? Assuming they are valid integers or strings.
            # Schema from view_file showed pincode as int usually 
            agg_df = df.group_by(keys).agg([pl.col(c).sum() for c in value_cols])
            
            dfs[name] = agg_df
            print(f"  Rows after aggregation: {len(agg_df)}")
            
        except Exception as e:
            print(f"ERROR processing {name}: {e}")
            return

    # JOIN
    if len(dfs) == 3:
        print("-" * 30)
        print("JOINING DATASETS...")
        
        # Join 1: Bio + Demo
        join1 = dfs["Biometric"].join(dfs["Demographic"], on=["pincode", "month"], how="inner")
        print(f"Bio + Demo Join Rows: {len(join1)}")
        
        # Join 2: + Enrolment
        final_join = join1.join(dfs["Enrolment"], on=["pincode", "month"], how="inner")
        print(f"Bio + Demo + Enrolment Join Rows: {len(final_join)}")
        
        print("-" * 30)
        print("FEASIBILITY STATISTICS (SAMPLE)")
        print("-" * 30)
        
        if len(final_join) > 0:
            print(f"Total Common PIN-Months: {len(final_join)}")
            n_unique_pins = final_join["pincode"].n_unique()
            print(f"Unique Pincodes in Intersection: {n_unique_pins}")
            
            min_date = final_join["month"].min()
            max_date = final_join["month"].max()
            print(f"Date Range Similarity: {min_date} to {max_date}")
            
            print("\nMissing Values (Null Count) in Intersection:")
            print(final_join.null_count())
            
            # Show a sample row
            print("\nSample Row:")
            print(final_join.head(1))
            
        else:
            print("NO OVERLAP FOUND.")
            print("Troubleshooting Hint: Check if date ranges or pincode ranges align in the sample files.")
            print("It is possible that the filenames 1000000_1500000 imply pincode ranges?")
            # Check pincode stats for each df
            for name, df in dfs.items():
                p_min = df["pincode"].min()
                p_max = df["pincode"].max()
                d_min = df["month"].min()
                d_max = df["month"].max()
                print(f"{name}: Pincodes [{p_min} - {p_max}], Dates [{d_min} - {d_max}]")

if __name__ == "__main__":
    analyze()
