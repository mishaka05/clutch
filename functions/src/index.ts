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
  
  const beforeSnap = change.before;
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
  
  // 3. Loop Prevention / Idempotency Check:
  // If the core task metrics (status, riskScore, progress, deadline, title) have not changed,
  // we exit early to prevent infinite Firestore trigger loops when updating the same task document.
  if (beforeSnap.exists && afterSnap.exists) {
    const beforeData = beforeSnap.data();
    const afterData = afterSnap.data();
    if (beforeData && afterData) {
      const coreUnchanged = 
        beforeData.status === afterData.status &&
        beforeData.riskScore === afterData.riskScore &&
        beforeData.progress === afterData.progress &&
        beforeData.deadline === afterData.deadline &&
        beforeData.title === afterData.title;
        
      if (coreUnchanged) {
        console.log(`Core task metrics are identical between snapshots for task ${taskId}. Skipping execution to prevent recursive trigger loops.`);
        return;
      }
    }
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
  
  // 4. Risk Evaluation logic matching guidelines
  if (riskScore >= 80) {
    requiresIntervention = true;
    reasonForIntervention = `Task risk score is critically high (${riskScore}%) with completion progress lagging at ${progress}%.`;
  } else if (hoursRemaining > 0 && hoursRemaining <= 24 && progress < 50) {
    requiresIntervention = true;
    reasonForIntervention = `Deadline is approaching within ${Math.round(hoursRemaining)} hours while completion progress remains low (${progress}%).`;
  }
  
  const notificationsRef = db.collection("users").doc(userId).collection("notifications");
  const logsRef = db.collection("users").doc(userId).collection("logs");
  const taskDocRef = db.collection("users").doc(userId).collection("tasks").doc(taskId);
  
  // Exit immediately if task is low-risk or doesn't meet the threshold
  if (!requiresIntervention) {
    console.log(`Task ${taskId} is evaluated as low risk (Score: ${riskScore}, Progress: ${progress}, Hours left: ${hoursRemaining.toFixed(1)}).`);
    
    // De-escalate task if it was previously marked as escalated
    if (taskData.escalated === true) {
      await taskDocRef.set({
        escalated: false,
        escalationState: "DE_ESCALATED",
        escalationDecision: null
      }, { merge: true });
      
      const deEscalationLogId = `log-deescalation-${taskId}`;
      await logsRef.doc(deEscalationLogId).set({
        id: deEscalationLogId,
        uid: userId,
        taskId: taskId,
        taskTitle: title,
        actionType: "do_nothing",
        actionTaken: "De-escalated Task Status",
        reason: "Risk has subsided below safe operating thresholds.",
        timestamp: new Date().toISOString(),
        isAgentInitiated: true,
        agentType: "ESCALATION_AGENT",
        evaluationSource: "deterministic",
        userApprovalApplied: "AUTONOMOUS",
        event: "escalation_evaluation",
        calculatedOutcome: "DE_ESCALATED"
      });
      console.log(`Successfully logged de-escalation for task ${taskId}`);
    }
    
    // Clear notifications
    const oppositeNotifDocRef1 = notificationsRef.doc(`risk_${taskId}`);
    const oppositeNotifDocRef2 = notificationsRef.doc(`emergency_${taskId}`);
    await oppositeNotifDocRef1.set({ isRead: true, unread: false }, { merge: true });
    await oppositeNotifDocRef2.set({ isRead: true, unread: false }, { merge: true });
    
    return;
  }
  
  try {
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
    
    // 5. Diagnostic Logging for Risk Assessment Agent
    const riskLogId = `log-backend-risk-${taskId}`;
    const calculatedOutcome = "INTERVENTION_REQUIRED";
    const actionTaken = `Generated ${type} risk notification warning in user dashboard`;
    
    // Construct rich audit-trail entry perfectly aligned with AgentLog schema
    const logPayload = {
      id: riskLogId,
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
    
    await logsRef.doc(riskLogId).set(logPayload);
    console.log(`Successfully created structured diagnostic log ${riskLogId} for task ${taskId}`);
    
    // ====================================================
    // ESCALATION AGENT LAYER (Autonomous backend layer)
    // ====================================================
    
    const shouldEscalate = (riskScore >= 80) || (hoursRemaining > 0 && hoursRemaining <= 24 && progress < 50);
    
    if (shouldEscalate) {
      console.log(`Escalation Agent triggered for task ${taskId}. Executing autonomous escalation pipeline...`);
      
      // Construct triggers list
      const triggeredBy: string[] = [];
      if (riskScore >= 80) triggeredBy.push("HIGH_RISK_SCORE");
      if (progress < 50) triggeredBy.push("LOW_PROGRESS");
      if (hoursRemaining > 0 && hoursRemaining <= 24) triggeredBy.push("DEADLINE_PROXIMITY");
      
      const escalationDecisionText = "Escalation approved due to insufficient remaining execution window.";
      const escalationReason = "Risk score exceeded safe operating threshold while remaining execution window is critically low.";
      
      // 1 & 2. Mark task internally as escalated & Write decision
      const escalationDecision = {
        level: "EMERGENCY",
        triggeredBy: triggeredBy,
        confidence: 95,
        decision: escalationDecisionText,
        timestamp: new Date().toISOString()
      };
      
      await taskDocRef.set({
        escalated: true,
        escalationState: "ESCALATED",
        escalationDecision: escalationDecision
      }, { merge: true });
      
      console.log(`Successfully wrote Escalation Decision payload to task ${taskId}`);
      
      // 3. Write detailed telemetry log for Escalation Agent (deterministic ID for idempotency)
      const escalationLogId = `log-escalation-${taskId}`;
      const escalationLogPayload = {
        id: escalationLogId,
        uid: userId,
        taskId: taskId,
        taskTitle: title,
        actionType: "escalate_risk" as const,
        actionTaken: "Emergency Escalation Approved",
        reason: escalationReason,
        timestamp: new Date().toISOString(),
        isAgentInitiated: true,
        agentType: "ESCALATION_AGENT" as const,
        evaluationSource: "deterministic",
        userApprovalApplied: "AUTONOMOUS",
        
        // Structured explainability details for telemetry timeline
        event: "escalation_evaluation",
        calculatedOutcome: "ESCALATION_APPROVED",
        decision: "Emergency escalation approved.",
        confidence: "95%",
        reasonForIntervention: escalationReason,
        actionTakenDetail: "Escalated task document state and dispatched emergency dashboard controls.",
        
        structuredReasoning: {
          metrics: {
            observedDeadline: deadline || "N/A",
            observedProgress: `${progress}%`,
            estimatedWorkRemaining: `${100 - progress}%`,
            riskScore: `${riskScore}%`
          },
          justificationText: escalationReason,
          decisionConfidence: 0.95
        }
      };
      
      await logsRef.doc(escalationLogId).set(escalationLogPayload);
      console.log(`Successfully wrote deterministic Escalation Log ${escalationLogId}`);
      
      // 4. Create or update the emergency notification (deterministic ID)
      const emergencyNotifId = `emergency_${taskId}`;
      const emergencyNotifDocRef = notificationsRef.doc(emergencyNotifId);
      const emergencySnap = await emergencyNotifDocRef.get();
      
      let emergencyIsRead = false;
      let emergencyUnread = true;
      let emergencyCreatedAt = new Date().toISOString();
      
      if (emergencySnap.exists) {
        const existingEmergencyData = emergencySnap.data();
        if (existingEmergencyData) {
          emergencyIsRead = existingEmergencyData.isRead ?? false;
          emergencyUnread = existingEmergencyData.unread ?? true;
          emergencyCreatedAt = existingEmergencyData.createdAt || existingEmergencyData.timestamp || new Date().toISOString();
        }
      }
      
      const emergencyText = `🚨 ${escalationReason} Escalation Agent autonomously approved EMERGENCY escalation status.`;
      
      const emergencyPayload = {
        id: emergencyNotifId,
        title: "🚨 Clutch Emergency Dispatch",
        body: emergencyText,
        description: emergencyText,
        timestamp: new Date().toISOString(),
        createdAt: emergencyCreatedAt,
        isRead: emergencyIsRead,
        unread: emergencyUnread,
        taskId: taskId,
        type: "crisis",
        severity: "crisis",
        source: "Backend Risk Agent", // keep source so Crisis Mode visual handlers stay standard
        riskScore: riskScore
      };
      
      await emergencyNotifDocRef.set(emergencyPayload, { merge: true });
      console.log(`Successfully dispatched Emergency notification ${emergencyNotifId}`);
    }
    
  } catch (error) {
    console.error(`Error executing Backend Risk Agent trigger for task ${taskId}:`, error);
  }
});
