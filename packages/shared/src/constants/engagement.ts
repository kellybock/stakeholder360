export const ENGAGEMENT_WEIGHTS = {
  recency: 0.30,
  frequency: 0.25,
  depth: 0.25,
  breadth: 0.20,
} as const;

export const REMINDER_THRESHOLDS_DAYS = {
  green: 60,
  amber: 90,
  red: 120,
} as const;

export const CHURN_RISK_THRESHOLDS = {
  low: 30,
  medium: 60,
  high: 80,
} as const;
