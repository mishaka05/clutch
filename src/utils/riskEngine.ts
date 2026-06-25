/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskComplexity } from '../types';

// Configurable constants for the Risk Engine
export const RISK_WINDOW_HOURS = 24; // Default baseline demonstration window
export const CRISIS_THRESHOLD_HOURS = 2; // Last 2 hours is the highest-risk period
export const SHARP_INCREASE_HOURS = 6; // Last 6 hours weighting increases significantly

export interface RiskEvaluationResult {
  riskScore: number;
  timeUrgency: number;
  complexityFactor: number;
  durationFactor: number;
  isCrisis: boolean;
  hoursRemaining: number;
}

/**
 * Calculates a dynamic risk score between 0 and 100 based on deadlines,
 * progress, complexity, estimated duration, and priority.
 */
export function calculateTaskRisk(params: {
  deadline: string | Date;
  progress: number; // 0 to 100
  complexity: TaskComplexity;
  estimatedDuration: number; // in minutes
  priorityWeight?: number; // optional multiplier/offset, default 1.0
  now?: Date;
}): RiskEvaluationResult {
  const targetNow = params.now || new Date();
  const deadlineDate = typeof params.deadline === 'string' ? new Date(params.deadline) : params.deadline;
  
  const msRemaining = deadlineDate.getTime() - targetNow.getTime();
  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  // 1. Calculate Nonlinear Time Urgency
  let timeUrgency = 0;

  if (hoursRemaining <= 0) {
    // Overdue tasks have maximum urgency
    timeUrgency = 100;
  } else if (hoursRemaining >= RISK_WINDOW_HOURS) {
    // > 24 hours: Low impact from time.
    // Scales gently from 0 to 10 based on how close it is to the 24-hour mark
    const windowExcess = Math.min(24, hoursRemaining - RISK_WINDOW_HOURS);
    timeUrgency = Math.max(0, 10 - (windowExcess / 24) * 10);
  } else if (hoursRemaining >= SHARP_INCREASE_HOURS) {
    // 24–6 hours: Gradually increasing urgency (from 10 to 45)
    const segmentRange = RISK_WINDOW_HOURS - SHARP_INCREASE_HOURS; // 18 hours
    const hoursInSegment = RISK_WINDOW_HOURS - hoursRemaining;
    timeUrgency = 10 + (hoursInSegment / segmentRange) * 35;
  } else if (hoursRemaining >= CRISIS_THRESHOLD_HOURS) {
    // 6–2 hours: Sharp increase (from 45 to 80)
    const segmentRange = SHARP_INCREASE_HOURS - CRISIS_THRESHOLD_HOURS; // 4 hours
    const hoursInSegment = SHARP_INCREASE_HOURS - hoursRemaining;
    timeUrgency = 45 + (hoursInSegment / segmentRange) * 35;
  } else {
    // < 2 hours: Crisis threshold (from 80 to 100)
    const hoursInSegment = CRISIS_THRESHOLD_HOURS - hoursRemaining;
    timeUrgency = 80 + (hoursInSegment / CRISIS_THRESHOLD_HOURS) * 20;
  }

  // 2. Complexity Factor (High = 100, Medium = 50, Low = 0)
  let complexityFactor = 0;
  if (params.complexity === 'high') {
    complexityFactor = 100;
  } else if (params.complexity === 'medium') {
    complexityFactor = 50;
  }

  // 3. Task Duration Factor (Longer tasks relative to remaining time pose higher risk)
  // E.g., if duration is 3 hours (180 mins) and we have only 4 hours remaining, risk is heightened.
  let durationFactor = 0;
  if (hoursRemaining > 0) {
    const durationHours = params.estimatedDuration / 60;
    const ratio = durationHours / hoursRemaining;
    // Cap duration impact to 30% added weight
    durationFactor = Math.min(100, ratio * 50);
  }

  // 4. Base Risk Composition (Urgency, Complexity, Duration)
  // Weighting: Time Urgency (55%), Complexity Weight (30%), Duration buffer (15%)
  let baseRisk = (timeUrgency * 0.55) + (complexityFactor * 0.30) + (durationFactor * 0.15);

  // Apply Priority Weighting if present (defaults to 1.0 / neutral)
  const priorityWeight = params.priorityWeight ?? 1.0;
  baseRisk = baseRisk * priorityWeight;

  // 5. Progress Reduction
  // Progress significantly reduces risk. If task is completed (100%), risk should drop to 0 instantly.
  let finalRisk = 0;
  if (params.progress >= 100) {
    finalRisk = 0;
  } else {
    // Progress reduces risk proportionally (e.g. 50% progress halves the final risk or subtracts direct weight)
    // Here we use a balanced subtraction: final = clamp(base - progress_factor)
    // Progress subtraction makes it drop rapidly:
    const progressFactor = params.progress; // Directly reduce risk score by progress percentage
    finalRisk = Math.max(0, baseRisk - progressFactor);
  }

  // Ensure risk is integer
  const roundedRisk = Math.round(Math.min(100, Math.max(0, finalRisk)));

  // Crisis Mode triggers if:
  // - hoursRemaining < 2 hours
  // - riskScore >= 80
  // - progress < 100 (not completed)
  const isCrisis = hoursRemaining > 0 && hoursRemaining < CRISIS_THRESHOLD_HOURS && roundedRisk >= 80 && params.progress < 100;

  return {
    riskScore: roundedRisk,
    timeUrgency: Math.round(timeUrgency),
    complexityFactor,
    durationFactor: Math.round(durationFactor),
    isCrisis,
    hoursRemaining: Math.max(0, hoursRemaining)
  };
}
