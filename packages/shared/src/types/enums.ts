export const CaseStatus = {
  NOMINATED: 'Nominated',
  ACTIVE: 'Active',
  CHAMPION: 'Champion',
  ADVOCATE: 'Advocate',
  DORMANT: 'Dormant',
} as const;

export type CaseStatusType = (typeof CaseStatus)[keyof typeof CaseStatus];

export const EngagementSegment = {
  CHAMPION: 'Champion',
  RISING_STAR: 'Rising Star',
  ACTIVE: 'Active',
  AT_RISK: 'At-Risk',
  DORMANT: 'Dormant',
} as const;

export type EngagementSegmentType = (typeof EngagementSegment)[keyof typeof EngagementSegment];

export const InterestLevel = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const;

export type InterestLevelType = (typeof InterestLevel)[keyof typeof InterestLevel];

export const UserRole = {
  ADMIN: 'admin',
  RM: 'rm',
  VIEWER: 'viewer',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];
