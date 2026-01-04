
import polars as pl
import glob
import os

base_dir = r"d:\Antigravity Projects\UIDAI Project"
dirs = {
    "Bio": os.path.join(base_dir, "api_data_aadhar_biometric"),
    "Demo": os.path.join(base_dir, "api_data_aadhar_demographic"),
    "Enrol": os.path.join(base_dir, "api_data_aadhar_enrolment")
}

output_file = "metadata_fixed.log"
with open(output_file, "w", encoding="utf-8") as f_out:
    header = f"{'Category':<10} | {'Filename':<55} | {'Min Date':<10} | {'Max Date':<10} | {'Min Pin':<7} | {'Max Pin':<7}\n"
    f_out.write(header)
    f_out.write("-" * 120 + "\n")

    for cat, d in dirs.items():
        pattern = os.path.join(d, "*.csv")
        files = sorted(glob.glob(pattern))
        for f in files:
            fname = os.path.basename(f)
            try:
                # Read columns date and pincode
                df = pl.read_csv(f, columns=["date", "pincode"], ignore_errors=True)
                
                try:
                    # Try parse date with two common formats just in case
                    try:
                        dates = df["date"].str.strptime(pl.Date, "%d-%m-%Y")
                    except:
                        try:
                            dates = df["date"].str.strptime(pl.Date, "%Y-%m-%d")
                        except:
                            dates = df["date"].str.to_date() # Auto
                        
                    min_d = dates.min()
                    max_d = dates.max()
                except:
                    min_d = "ParseErr"
                    max_d = "ParseErr"
                
                try:
                    min_p = df["pincode"].min()
                    max_p = df["pincode"].max()
                except:
                     min_p = "Err"
                     max_p = "Err"
                
                line = f"{cat:<10} | {fname:<55} | {str(min_d):<10} | {str(max_d):<10} | {str(min_p):<7} | {str(max_p):<7}\n"
                f_out.write(line)
                print(f"Processed {fname}")
                
            except Exception as e:
                err_line = f"{cat:<10} | {fname:<55} | Error: {e}\n"
                f_out.write(err_line)
                print(f"Error processing {fname}")
