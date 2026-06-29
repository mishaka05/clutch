# Clutch AI Operating System: Guided Demo Script

Follow this step-by-step walkthrough to experience the full operational lifecycle of the **Clutch AI Operating System** in a demonstration environment.

---

## Step 1: Portal Ingress (Splash)
1. Open the application link.
2. Select **"Demo Mode" / "Enter Guest Workspace"** on the welcome modal.
3. This registers a secure anonymous authenticated profile instantly, skipping long third-party setups while granting complete workspace capabilities.

---

## Step 2: Task Ingestion & Autonomous Parsing
1. Click the **"Add Task"** action on the header.
2. Enter the following raw statement:
   > *"submit my math report by tomorrow noon, need to draft proofs, write code, and draw graphs"*
3. Submit the form.
4. Watch the pipeline trigger:
   * **Task Parsing Agent** extracts the deadline relative to your local computer date.
   * **Subtask Checklist** dynamically creates three items: "Draft proofs", "Write code", and "Draw graphs".
   * **Risk Assessment Agent** evaluates current hour boundaries and populates an initial risk percentage.

---

## Step 3: Triggering Crisis Mode & Overlays
1. Click on your newly added math task.
2. Uncheck your subtasks to keep progress low.
3. In the right panel, select **"Edit Deadlines"** and set the limit to just **1 hour from now**.
4. Save your changes.
5. Watch the dashboard instantly transform:
   * **Crisis Mode active**: Dark red-glowing workspace.
   * **Emergency countdown ticker** begins counting down to the exact second.
   * **Telemetry console** prints alert logs outlining critical urgency levels.

---

## Step 4: The Recovery Agent Fallback
1. Click **"Book Focus Slot"** in the chat panel suggestions.
2. Notice that Clutch automatically identifies your authentication context.
3. Because you are in **Demo Mode**, the **Recovery Agent** triggers, printing a clean local booking notice:
   * *Success: Focus block allocated locally inside your secure workspace.*
4. The scheduling block is logged to your active log audits, bypassing external integrations cleanly without errors.

---

## Step 5: Decision Coach Dialogues
1. Open the **Clutch Coach Panel** on the task details page.
2. Type: *"Give me a 3-step action plan to finish this math report."*
3. Read the prompt output:
   * The coach evaluates remaining subtasks and outputs a concise, markdown-styled structured list of steps.
   * Follow the steps, mark subtasks complete, and watch the Risk Score instantly drop, lifting Crisis Mode safely!
