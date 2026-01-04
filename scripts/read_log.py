
import os

import sys

files = sys.argv[1:] if len(sys.argv) > 1 else ["docs/logs/analysis_log.txt", "docs/logs/metadata.log"]
for filename in files:
    if os.path.exists(filename):
        print(f"--- CONTENT OF {filename} ---")
        try:
            # Try utf-16 (powershell redirection default)
            with open(filename, "r", encoding="utf-16") as f:
                print(f.read())
        except Exception as e:
            print(f"UTF-16 failed: {e}")
            try:
                with open(filename, "r", encoding="utf-8") as f:
                    print(f.read())
            except Exception as e2:
                print(f"UTF-8 failed: {e2}")
