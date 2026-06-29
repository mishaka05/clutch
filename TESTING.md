# Clutch AI Operating System: Testing Manual

This document details the testing workflows, validation criteria, and diagnostic checks used to verify the reliability of the **Clutch AI Operating System**.

---

## 1. Automated Syntax & Build Verification

Clutch employs TypeScript compilation rules and rigorous linters to catch typos, structural issues, and module mismatches before deployments.

### Run Code Linter
To verify syntax constraints, type safety, and framework code standards:
```bash
npm run lint
```
*This command runs `tsc --noEmit` and reports any compile-time mismatch.*

### Execute Production Build Compile
Verify the code is fully compatible with bundle optimization:
```bash
npm run build
```
*Confirms successful bundling of React static pages and server entry-points inside `/dist`.*

---

## 2. Manual Agent Pipeline Integration Testing

To confirm the correctness of each agent in the pipeline:

### 2.1 Task Parsing Verification
1. Create a task with complex, unstructured text: *"submit the finance deck in three days, must compile tables, edit slides, and review with CEO."*
2. Verify that:
   * The relative deadline is parsed exactly 3 days from current computer time.
   * Core subtasks ("Compile tables", "Edit slides", "Review with CEO") are populated in the checklist.
   * Category is classified as `work`/`finance`.

### 2.2 Risk Calculation & Crisis Verification
1. Select a task with an extremely short deadline (e.g., 2 hours from now) and several incomplete subtasks.
2. Confirm the **Risk Score** climbs above $75\%$.
3. Check that **Crisis Mode** triggers:
   * Screen goes dark-themed with glowing red borders.
   * Ticking countdown ticker updates every 1000ms.
   * Diagnostic Console streams information about critical vulnerability thresholds.

### 2.3 Calendar Interlock & Fallback Verification
1. Click **Schedule Focus Slot** inside a task checklist.
2. **If in Demo Mode**:
   * Confirm that no external HTTP errors are logged.
   * Check the Diagnostics console to see `Success (Local Focus Session Scheduled)`.
3. **If in Live Google Calendar Mode**:
   * Ensure OAuth window pops up, requests Google permissions, and writes to sessionStorage.
   * Check your physical Google Calendar web app to verify a 45-minute deep-work event has appeared.
