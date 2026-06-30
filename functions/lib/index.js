"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateTaskRisk = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
/**
 * Event-driven Cloud Function triggered on any change to a task document.
 * Path: /users/{userId}/tasks/{taskId}
 *
 * Responsibilities:
 * 1. Read task document and evaluate risk using existing task metrics.
 * 2. Exit early if task is deleted, completed, dismissed, or low-risk.
 * 3. Generate a distinct dashboard notification for critical risk alerts.
 * 4. Write a structured diagnostic entry to trace agent decision logic.
 * 5. Ensure complete safety, idempotency, and loop avoidance.
 */
exports.evaluateTaskRisk = (0, firestore_1.onDocumentWritten)("users/{userId}/tasks/{taskId}", async (event) => {
    const { userId, taskId } = event.params;
    const change = event.data;
    if (!change) {
        console.log("No data change object found.");
        return;
    }
    const afterSnap = change.after;
    // 1. Safety: Gracefully handle deleted tasks
    if (!afterSnap.exists) {
        console.log(`Task ${taskId} was deleted. Gracefully exiting Backend Risk Agent.`);
        return;
    }
    const taskData = afterSnap.data();
    if (!taskData) {
        console.log(`Task data is empty for ${taskId}. Exiting.`);
        return;
    }
    // 2. Safety: Exit early if task is not active
    const status = taskData.status;
    if (status === "completed" || status === "dismissed") {
        console.log(`Task ${taskId} has status '${status}'. No risk evaluation needed. Exiting.`);
        return;
    }
    // Extract metrics
    const riskScore = taskData.riskScore ?? 0;
    const progress = taskData.progress ?? 0;
    const deadline = taskData.deadline;
    const title = taskData.title || "Untitled Task";
    // Calculate remaining time
    let hoursRemaining = 999999;
    if (deadline) {
        const deadlineDate = new Date(deadline);
        const now = new Date();
        hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    }
    let requiresIntervention = false;
    let reasonForIntervention = "";
    // 3. Risk Evaluation logic matching guidelines
    if (riskScore >= 80) {
        requiresIntervention = true;
        reasonForIntervention = `Task risk score is critically high (${riskScore}%) with completion progress lagging at ${progress}%.`;
    }
    else if (hoursRemaining > 0 && hoursRemaining <= 24 && progress < 50) {
        requiresIntervention = true;
        reasonForIntervention = `Deadline is approaching within ${Math.round(hoursRemaining)} hours while completion progress remains low (${progress}%).`;
    }
    // Exit immediately if task is low-risk or doesn't meet the threshold
    if (!requiresIntervention) {
        console.log(`Task ${taskId} is evaluated as low risk (Score: ${riskScore}, Progress: ${progress}, Hours left: ${hoursRemaining.toFixed(1)}). Exiting.`);
        return;
    }
    try {
        const notificationsRef = db.collection("users").doc(userId).collection("notifications");
        // 4. Safety: Check for existing unread risk notification to avoid duplicate writes
        const existingNotifQuery = await notificationsRef
            .where("taskId", "==", taskId)
            .where("isRead", "==", false)
            .where("source", "==", "Backend Risk Agent")
            .limit(1)
            .get();
        if (!existingNotifQuery.empty) {
            console.log(`An unresolved active risk notification for task ${taskId} already exists. Skipping duplicate creation.`);
            return;
        }
        const notifId = `notif-backend-risk-${taskId}-${Math.random().toString(36).substring(2, 7)}`;
        const notificationText = `${reasonForIntervention} Backend Risk Agent generated an intervention notification.`;
        // Create dashboard-compliant notification
        const notificationPayload = {
            id: notifId,
            title: "Backend Risk Agent Alert",
            body: notificationText,
            description: notificationText,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isRead: false,
            unread: true,
            taskId: taskId,
            type: "warning",
            severity: "warning",
            source: "Backend Risk Agent"
        };
        await notificationsRef.doc(notifId).set(notificationPayload);
        console.log(`Successfully created risk notification ${notifId} for task ${taskId}`);
        // 5. Diagnostic Logging
        const logsRef = db.collection("users").doc(userId).collection("logs");
        const logId = `log-backend-risk-${taskId}-${Math.random().toString(36).substring(2, 7)}`;
        const calculatedOutcome = "INTERVENTION_REQUIRED";
        const actionTaken = "Generated risk notification warning in user dashboard";
        // Construct rich audit-trail entry perfectly aligned with AgentLog schema
        const logPayload = {
            id: logId,
            uid: userId,
            taskId: taskId,
            taskTitle: title,
            actionType: "send_alert",
            actionTaken: "Backend Risk Agent Intervention",
            reason: reasonForIntervention.length > 100 ? `${reasonForIntervention.substring(0, 97)}...` : reasonForIntervention,
            timestamp: new Date().toISOString(),
            isAgentInitiated: true,
            agentType: "RISK_ASSESSOR",
            evaluationSource: "deterministic",
            userApprovalApplied: "AUTONOMOUS",
            // Explicit prompt requirements
            event: "backend_risk_evaluation",
            calculatedOutcome: calculatedOutcome,
            reasonForIntervention: reasonForIntervention,
            actionTakenDetail: actionTaken,
            // Explainability details for dashboard rendering
            structuredReasoning: {
                metrics: {
                    observedDeadline: deadline || "N/A",
                    observedProgress: `${progress}%`,
                    estimatedWorkRemaining: `${100 - progress}%`,
                    riskScore: `${riskScore}%`
                },
                justificationText: reasonForIntervention,
                decisionConfidence: 0.95
            }
        };
        await logsRef.doc(logId).set(logPayload);
        console.log(`Successfully created structured diagnostic log ${logId} for task ${taskId}`);
    }
    catch (error) {
        console.error(`Error executing Backend Risk Agent trigger for task ${taskId}:`, error);
    }
});
//# sourceMappingURL=index.js.map