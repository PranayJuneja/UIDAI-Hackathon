# Feasibility Analysis Plan for Project Chronos-X

## Goal
To determine the technical viability of building "Chronos-X", a parallel-future engine that predicts the future of a PIN code by finding similar historical trajectories of other PIN codes.

## Data Verification Strategy
We need to confirm that the "Pulse Vector" $V_{p,t}$ can be constructed consistently for a significant number of PIN codes over a meaningful time horizon.

### 1. Data Availability & Schema Check
- **Objective:** Verify we have the 3 key signals: Growth (Enrolment), Flow (Demographics), Labor (Biometrics).
- **Status:** *Preliminary check successful.*
    - Biometric: `bio_age_17_` available.
    - Demographic: `demo_age_17_` available.
    - Enrolment: `age_0_5` available.
- **Action:** Confirm these columns are populated and not empty/null.

### 2. Temporal Alignment Check
- **Problem:** Data might be daily, weekly, or ad-hoc.
- **Goal:** We need **Monthly** aggregation ($V_{p,t}$).
- **Action:**
    - Script to check date distribution in all 3 datasets.
    - Determine if we can roll up data to Month-Level (Suspect Enrolment is weekly, Demo/Bio might be monthly or daily).

### 3. Spatial Overlap (Joinability)
- **Problem:** We might have Biometrics for PIN A but only Enrolment for PIN B.
- **Goal:** Intersection of PIN codes across all 3 datasets.
- **Action:**
    - Script to count unique PINs in each dataset.
    - Calculate the intersection count ($PIN_{bio} \cap PIN_{demo} \cap PIN_{enrol}$).

## Edge Case Analysis
We need to identify scenarios where the "History Search" logic might fail.

1.  **"New Born" PINs:** PIN codes that didn't exist 5 years ago.
2.  **Data Blackouts:** Months where data is missing for a region (e.g., internet shutdown, natural disaster).
3.  **Scale Mismatch:** Comparing a PIN with population 100 to one with 100,000. (Need Normalization).
4.  **Lag:** Enrolment data might arrive weeks later than Biometric data.

## Script Check Plan
I will write a Python script `analyze_feasibility.py` using `polars` (fast CSV processing) to:
1.  Load samples of all 3 datasets.
2.  Normalize dates to `YYYY-MM`.
3.  Perform an inner join on `pincode` and `month`.
4.  Print statistics:
    - Total common PIN-Months.
    - Date range availability.
    - Missing value counts.

## Go/No-Go Criteria
- **Go:** $> 70\%$ of PINs have overlapping data for $> 12$ months.
- **No-Go:** Spatial intersection is $< 10\%$ or time depth is $< 6$ months.
