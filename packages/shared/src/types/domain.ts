export interface Stakeholder360 {
  profile: StakeholderProfile;
  interactions: InteractionRecord[];
  events: EventRecord[];
  awards: AwardRecord[];
  community: CommunityRecord[];
  overseasRepresentation: OverseasRecord[];
  areasOfInterest: AOIRecord[];
  engagementScore: EngagementScore | null;
  crossAgencyCount: number;
  agencies: string[];
  relationshipManagers: RMRecord[];
}

export interface StakeholderProfile {
  id: string;
  caseId: string | null;
  caseStatus: string | null;
  nricMasked: string;
  fullName: string;
  race: string | null;
  sex: string | null;
  email: string | null;
  mobileNumber: string | null;
  residentialStatus: string | null;
  yearOfBirth: number | null;
  employerOrg: string | null;
  designation: string | null;
  dataConsent: boolean;
  linkedinHandle: string | null;
  writeUp: string | null;
  reasonForNomination: string | null;
  sourceAgency: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InteractionRecord {
  id: string;
  interactionDetails: string | null;
  meetingDate: string | null;
  agency: string | null;
  pocStaffName: string | null;
  pocStaffEmail: string | null;
  briefNotes: string | null;
}

export interface EventRecord {
  id: string;
  eventTitle: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  organizerAgency: string | null;
  partners: string | null;
  eventType: string | null;
  aoiForEvent: string | null;
  roleOfYouth: string | null;
  attendance: string | null;
  briefNotes: string | null;
}

export interface AwardRecord {
  id: string;
  year: number | null;
  awardName: string;
  description: string | null;
}

export interface CommunityRecord {
  id: string;
  startDate: string | null;
  endDate: string | null;
  orgGroupName: string | null;
  role: string | null;
  description: string | null;
}

export interface OverseasRecord {
  id: string;
  year: number | null;
  description: string | null;
}

export interface AOIRecord {
  id: string;
  areaOfInterest: string;
  alignment: string | null;
  levelOfInterest: string | null;
  levelOfInfluence: string | null;
  agency: string | null;
}

export interface RMRecord {
  id: string;
  name: string;
  email: string;
  agency: string;
}

export interface EngagementScore {
  totalScore: number;
  recencyScore: number;
  frequencyScore: number;
  depthScore: number;
  breadthScore: number;
  segment: string;
  churnRisk: number;
  calculatedAt: string;
}

export interface TimelineEntry {
  id: string;
  type: 'interaction' | 'event' | 'award' | 'community' | 'overseas';
  date: string;
  title: string;
  description: string | null;
  agency: string | null;
  metadata: Record<string, unknown>;
}
