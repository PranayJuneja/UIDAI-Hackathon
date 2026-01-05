# Overconstruct: Integrated Context & Search Engine for Chronos-X

## 1. Executive Summary & Findings

The goal is to enhance Chronos-X (the "Weather Forecast for Aadhaar") by integrating external world knowledge—specifically web search and calendar events—to validate assumptions and explain predictions.

### Key Findings from Research
1.  **Elections & Aadhaar Updates:**
    *   **Finding:** There is **no verifiable statistical evidence** that elections cause a generic surge in Aadhaar updates. Most "election rushes" are for *Voter ID* cards.
    *   **Decision:** We will **NOT** artificially inflate forecast numbers based on election schedules. Doing so would risk "hallucinating" demand.
    *   **Strategy:** We will use elections only as *context* (e.g., "Note: Local administration may hold ad-hoc camps due to the upcoming election").

2.  **School Admissions (Strong Link):**
    *   **Finding:** Validated. Schools routinely press for Aadhaar during admission cycles (March-June), even if not legally mandatory.
    *   **Action:** This is a predictable "Growth Signal" driver.

3.  **Harvest Seasons (Strong Link):**
    *   **Finding:** Validated. Kharif (Oct/Nov) and Rabi (Mar/Apr) harvests drive massive migrant labor movement.
    *   **Action:** This is a predictable "Flow/Labor Signal" driver.

### Core Strategy: Qualitative Context (Option B)
Instead of modifying the *numbers* (which risks corruption), we will build a **Context Engine**. This engine injects qualitative explanations into the LLM, allowing it to "interpret" the Chronos forecast intelligently.

---

## 2. Architecture: The Context Engine

We will introduce a new module `src/context_engine.py` that sits between the `ChronosX` engine and the `Attestor` (LLM).

### Layer 1: Deterministic Calendar (The "Predictable")
These are hardcoded, recurring events based on the month and season.

| Event | Timing | Signals Affected | Context Logic |
| :--- | :--- | :--- | :--- |
| **School Admissions** | March - June | **Growth** (0-5y) | "School admission season is active. Expect spikes in child enrolment." |
| **Kharif Harvest** | Oct - Nov | **Flow/Labor** | "Harvest season. Expect high migration (Labor Arrival in Agri belts vs. Return in Source belts)." |
| **Rabi Harvest** | March - April | **Flow/Labor** | "Rabi Harvest. Expect labor movement." |
| **MBU Deadlines** | All Year | **Biometric** | "Mandatory Biometric Updates for Age 5/15 are key drivers." |

#### The "Directionality" Solution (Immigration vs. Emigration)
A key challenge is knowing if "Harvest Season" means workers are *coming* or *going*.
*   **Problem:** "Harvest" implies movement, but direction depends on whether the region is a *Source* (Village) or *Destination* (Farm/City).
*   **Solution:** The Context Engine **does not guess**. It provides the *Season*, and relies on the **LLM's semantic knowledge** + **Chronos Forecast** to generate the explanation.
    *   *Scenario A:* Chronos predicts `High Flow` for a Punjab PIN in Oct.
        *   LLM Input: `Forecast: High Flow`, `Context: Kharif Harvest`, `Location: Ludhiana`.
        *   LLM Output: "High flow is likely due to laborers **arriving** for the harvest."
    *   *Scenario B:* Chronos predicts `High Flow` for a Bihar PIN in Oct.
        *   LLM Input: `Forecast: High Flow`, `Context: Kharif Harvest`, `Location: Madhubani`.
        *   LLM Output: "High flow is likely due to workers **returning** home."

### Layer 2: Live Web Search (The "Unpredictable")
This layer is triggered *on-demand* for specific complex queries.

*   **Trigger:** User asks "Why?" or specific anomaly queries.
*   **Mechanism:** Uses a search tool to query: `"{Location} news {Month} {Year}"` or `"{Location} Aadhaar camps"`.
*   **Goal:** Find one-off events (e.g., "Floods", "Kumbh Mela", "New Industrial Park opening").

---

## 3. Implementation Strategy (Step-by-Step)

### Step 1: Create `src/context_engine.py`
This module will house the logic for both Calendar and Search context.

```python
class ContextEngine:
    def get_context(self, pincode, month, run_search=False):
        # 1. Get Calendar Context
        context = self._get_calendar_events(month)

        # 2. Get Web Context (Optional)
        if run_search:
            context["news"] = self._search_events(pincode)

        return context
```

### Step 2: Implement `_get_calendar_events`
Implement the logic to map months to seasons.
*   *Input:* Target Month (e.g., "2025-10-01").
*   *Output:* List of active seasons/drivers.

### Step 3: Implement `_search_events` (Mock/Real Wrapper)
Implement a wrapper around the search tool.
*   *Query Strategy:* "Impact of events in [City] on migration [Month] [Year]"
*   *Fallback:* If search fails, return empty context (fail gracefully).

### Step 4: Integrate into `Attestor.chat()`
Modify `src/attestation.py` to accept this new context and format it for the prompt.

**New Prompt Structure:**
```text
## Data Context
Region: {Location}
Forecast: {Chronos Numbers}

## Contextual Drivers (Context Engine)
- Season: Kharif Harvest (Labor Movement)
- Local News: "Election rallies planned in district" (from Search)

## Task
Explain the forecast using the Contextual Drivers.
```

---

## 4. Verification Plan

We will verify the implementation by simulating "Source" and "Destination" queries.

1.  **Test Case 1 (Agri Destination):** Query for a Punjab PIN in October.
    *   *Expectation:* Chatbot mentions "Harvest season" and "Labor arrival".
2.  **Test Case 2 (Source Region):** Query for a Bihar/UP PIN in October.
    *   *Expectation:* Chatbot mentions "Harvest season" and "Returning workers".
3.  **Test Case 3 (School Season):** Query for any PIN in April.
    *   *Expectation:* Chatbot warns about "School Admission rush".

This plan ensures we leverage external knowledge without corrupting the core mathematical forecast.
