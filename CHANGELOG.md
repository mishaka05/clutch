# Clutch AI Operating System: Changelog

All notable changes to the **Clutch AI Operating System** will be documented in this file.

---

## [1.0.0] - 2026-06-29

### Added
* **Task Parsing Agent**: Implemented structured output mapping for parsing unstructured inputs into subtask milestones with relative date support.
* **Risk Assessment Agent**: Created multi-factor scoring formula incorporating urgency, complexity, and track-record parameters to compute a live Risk Score (0-100%).
* **Crisis Mode Overlay**: Added heavy high-urgency alerts, dark-pulse layouts, and countdown audio alerts triggered automatically whenever a task's Risk Score exceeds 75%.
* **Scheduling Agent & Conflict Detection**: Scans calendar blocks using Google Calendar APIs, automatically checking free/busy states and inserting 45-minute sprint periods.
* **Recovery Agent**: Configured a circuit-breaker mechanism to gracefully fallback from real Google Calendar operations to Local Workspace Scheduling during offline/demo sessions.
* **Diagnostics Agent (Telemetry Console)**: Created a split-screen telemetry output showing pipeline audit trails, authorization contexts, and API call categories.
* **Decision Coach (Clutch Coach)**: Integrated a slide-out chat pane running server-side Gemini prompts for specialized, structured deadline-rescue plans.
* **Framer Motion Integration**: Added modern fade-ins, sliding panel draws, and list rearrangements.
* **Guest / Demo Mode Support**: Built robust anonymous login support permitting immediate access without real third-party credentials.
