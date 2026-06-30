/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

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
export const evaluateTaskRisk = onDocumentWritten("users/{userId}/tasks/{taskId}", async (event) => {
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
  } else if (hoursRemaining > 0 && hoursRemaining <= 24 && progress < 50) {
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
    
    // Determine the notification type, title, and ID based on the risk level
    let notifId = "";
    let notifTitle = "";
    let type: "warning" | "crisis" = "warning";
    let severity: "warning" | "crisis" = "warning";
    
    if (riskScore >= 80) {
      notifId = `emergency_${taskId}`;
      notifTitle = "🚨 Clutch Emergency Dispatch";
      type = "crisis";
      severity = "crisis";
    } else {
      notifId = `risk_${taskId}`;
      notifTitle = "⚠️ Clutch High Risk Warning";
      type = "warning";
      severity = "warning";
    }
    
    const notifDocRef = notificationsRef.doc(notifId);
    const notifSnap = await notifDocRef.get();
    
    let isRead = false;
    let unread = true;
    let createdAt = new Date().toISOString();
    
    if (notifSnap.exists) {
      const existingData = notifSnap.data();
      if (existingData) {
        // Preserve read/unread state from the existing notification document
        isRead = existingData.isRead ?? false;
        unread = existingData.unread ?? true;
        createdAt = existingData.createdAt || existingData.timestamp || new Date().toISOString();
      }
    }
    
    const notificationText = `${reasonForIntervention} Backend Risk Agent generated an intervention notification.`;
    
    // Create or update the dashboard-compliant notification using deterministic ID
    const notificationPayload = {
      id: notifId,
      title: notifTitle,
      body: notificationText,
      description: notificationText,
      timestamp: new Date().toISOString(),
      createdAt: createdAt,
      isRead: isRead,
      unread: unread,
      taskId: taskId,
      type: type,
      severity: severity,
      source: "Backend Risk Agent",
      riskScore: riskScore
    };
    
    await notifDocRef.set(notificationPayload, { merge: true });
    console.log(`Successfully upserted risk notification ${notifId} for task ${taskId}`);
    
    // Resolve/clean up the other notification type to avoid stale notifications
    if (notifId === `emergency_${taskId}`) {
      const oppositeNotifDocRef = notificationsRef.doc(`risk_${taskId}`);
      const oppositeNotifSnap = await oppositeNotifDocRef.get();
      if (oppositeNotifSnap.exists) {
        // Mark as read/unread or delete. Let's mark it as read and unread: false so it doesn't alert
        await oppositeNotifDocRef.set({ isRead: true, unread: false }, { merge: true });
        console.log(`Deactivated stale high risk notification for task ${taskId} upon escalation to emergency.`);
      }
    } else {
      const oppositeNotifDocRef = notificationsRef.doc(`emergency_${taskId}`);
      const oppositeNotifSnap = await oppositeNotifDocRef.get();
      if (oppositeNotifSnap.exists) {
        await oppositeNotifDocRef.set({ isRead: true, unread: false }, { merge: true });
        console.log(`Deactivated stale emergency notification for task ${taskId} upon de-escalation to warning.`);
      }
    }
    
    // 5. Diagnostic Logging
    const logsRef = db.collection("users").doc(userId).collection("logs");
    const logId = `log-backend-risk-${taskId}-${Math.random().toString(36).substring(2, 7)}`;
    
    const calculatedOutcome = "INTERVENTION_REQUIRED";
    const actionTaken = `Generated ${type} risk notification warning in user dashboard`;
    
    // Construct rich audit-trail entry perfectly aligned with AgentLog schema
    const logPayload = {
      id: logId,
      uid: userId,
      taskId: taskId,
      taskTitle: title,
      actionType: "send_alert" as const,
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
    
  } catch (error) {
    console.error(`Error executing Backend Risk Agent trigger for task ${taskId}:`, error);
  }
});
