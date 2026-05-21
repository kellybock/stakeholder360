import { hashNric, maskNric } from '@youth360/shared';
import { db } from '@youth360/db';
import * as schema from '@youth360/db';
import { getDataMode } from './data-mode';

export interface StoredProfile {
  id: string;
  nricHash: string;
  nricMasked: string;
  fullName: string;
  caseId: string | null;
  caseStatus: string | null;
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
  areasOfInterest: string | null;
  rmDetails: string | null;
  sourceAgency: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredRM {
  id: string;
  rmId: string | null;
  name: string;
  email: string;
  agency: string;
}

export interface StoredAOI {
  id: string;
  nricHash: string;
  aoiId: string | null;
  areaOfInterest: string;
  alignment: string | null;
  levelOfInterest: string | null;
  levelOfInfluence: string | null;
  agency: string | null;
}

export interface StoredInteraction {
  id: string;
  nricHash: string;
  interactionDetails: string | null;
  meetingDate: string | null;
  agency: string | null;
  pocStaffName: string | null;
  pocStaffEmail: string | null;
  briefNotes: string | null;
}

export interface StoredEvent {
  id: string;
  nricHash: string;
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
  additionalNotes: string | null;
}

export interface StoredAward {
  id: string;
  nricHash: string;
  year: number | null;
  awardName: string;
  description: string | null;
}

export interface StoredCommunity {
  id: string;
  nricHash: string;
  startDate: string | null;
  endDate: string | null;
  orgGroupName: string | null;
  role: string | null;
  description: string | null;
}

export interface StoredOverseas {
  id: string;
  nricHash: string;
  year: number | null;
  description: string | null;
}

export interface UploadRecord {
  id: string;
  fileName: string;
  tableTarget: string;
  rowCount: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsFailed: number;
  status: string;
  createdAt: string;
}

class DataStore {
  profiles: StoredProfile[] = [];
  relationshipManagers: StoredRM[] = [];
  areasOfInterest: StoredAOI[] = [];
  interactions: StoredInteraction[] = [];
  events: StoredEvent[] = [];
  awards: StoredAward[] = [];
  community: StoredCommunity[] = [];
  overseasRepresentation: StoredOverseas[] = [];
  uploadHistory: UploadRecord[] = [];

  private nextId(): string {
    return crypto.randomUUID();
  }

  upsertProfiles(rows: Record<string, string | number | undefined>[]): { inserted: number; updated: number; failed: number } {
    let inserted = 0, updated = 0, failed = 0;

    for (const row of rows) {
      try {
        const nric = String(row['Full NRIC'] ?? '').toUpperCase().trim();
        if (!nric) { failed++; continue; }

        const nricH = hashNric(nric);
        const existing = this.profiles.find(p => p.nricHash === nricH);

        const profile: StoredProfile = {
          id: existing?.id ?? this.nextId(),
          nricHash: nricH,
          nricMasked: maskNric(nric),
          fullName: String(row['Full Name'] ?? existing?.fullName ?? ''),
          caseId: String(row['Case ID'] ?? existing?.caseId ?? '') || null,
          caseStatus: String(row['Case Status'] ?? existing?.caseStatus ?? '') || null,
          race: String(row['Race'] ?? existing?.race ?? '') || null,
          sex: String(row['Sex'] ?? existing?.sex ?? '') || null,
          email: String(row['Email Address'] ?? existing?.email ?? '') || null,
          mobileNumber: String(row['Mobile Number'] ?? existing?.mobileNumber ?? '') || null,
          residentialStatus: String(row['Residential Status'] ?? existing?.residentialStatus ?? '') || null,
          yearOfBirth: row['Year of Birth'] ? Number(row['Year of Birth']) : existing?.yearOfBirth ?? null,
          employerOrg: String(row['Name of Employer/Organisation'] ?? existing?.employerOrg ?? '') || null,
          designation: String(row['Designation'] ?? existing?.designation ?? '') || null,
          dataConsent: String(row['Data Consent']).toLowerCase() === 'yes' || existing?.dataConsent === true,
          linkedinHandle: String(row['LinkedIn Handle'] ?? existing?.linkedinHandle ?? '') || null,
          writeUp: String(row['Write-up on the Individual'] ?? existing?.writeUp ?? '') || null,
          reasonForNomination: String(row['Reason for Nomination'] ?? existing?.reasonForNomination ?? '') || null,
          areasOfInterest: String(row['Area(s) of Interest'] ?? existing?.areasOfInterest ?? '') || null,
          rmDetails: String(row['Relationship Manager (RM) Details'] ?? row['Relationship Manager(RM) Details'] ?? existing?.rmDetails ?? '') || null,
          sourceAgency: existing?.sourceAgency ?? null,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existing) {
          const idx = this.profiles.indexOf(existing);
          this.profiles[idx] = profile;
          updated++;
        } else {
          this.profiles.push(profile);
          inserted++;
        }
      } catch {
        failed++;
      }
    }
    return { inserted, updated, failed };
  }

  upsertRelationshipManagers(rows: Record<string, string | number | undefined>[]): { inserted: number; updated: number; failed: number } {
    let inserted = 0, updated = 0, failed = 0;
    for (const row of rows) {
      try {
        const email = String(row['Relationship Manager Email'] ?? '').trim();
        if (!email) { failed++; continue; }
        const existing = this.relationshipManagers.find(r => r.email === email);
        const rm: StoredRM = {
          id: existing?.id ?? this.nextId(),
          rmId: String(row['RM ID'] ?? existing?.rmId ?? '') || null,
          name: String(row['Relationship Manager'] ?? ''),
          email,
          agency: String(row['Agency'] ?? ''),
        };
        if (existing) {
          const idx = this.relationshipManagers.indexOf(existing);
          this.relationshipManagers[idx] = rm;
          updated++;
        } else {
          this.relationshipManagers.push(rm);
          inserted++;
        }
      } catch { failed++; }
    }
    return { inserted, updated, failed };
  }

  upsertAreasOfInterest(rows: Record<string, string | number | undefined>[]): { inserted: number; updated: number; failed: number } {
    let inserted = 0, updated = 0, failed = 0;
    for (const row of rows) {
      try {
        const nric = String(row['Full NRIC'] ?? '').toUpperCase().trim();
        if (!nric) { failed++; continue; }
        const nricH = hashNric(nric);
        const aoi = String(row['Area of Interest'] ?? '');
        const agency = String(row['Agency'] ?? '') || null;
        const existing = this.areasOfInterest.find(a => a.nricHash === nricH && a.areaOfInterest === aoi && a.agency === agency);
        const record: StoredAOI = {
          id: existing?.id ?? this.nextId(),
          nricHash: nricH,
          aoiId: String(row['AOI ID'] ?? '') || null,
          areaOfInterest: aoi,
          alignment: String(row['Alignment'] ?? '') || null,
          levelOfInterest: String(row['Level of Interest'] ?? '') || null,
          levelOfInfluence: String(row['Level of Influence'] ?? '') || null,
          agency,
        };
        if (existing) {
          const idx = this.areasOfInterest.indexOf(existing);
          this.areasOfInterest[idx] = record;
          updated++;
        } else {
          this.areasOfInterest.push(record);
          inserted++;
        }
      } catch { failed++; }
    }
    return { inserted, updated, failed };
  }

  upsertInteractions(rows: Record<string, string | number | undefined>[]): { inserted: number; updated: number; failed: number } {
    let inserted = 0, updated = 0, failed = 0;
    for (const row of rows) {
      try {
        const nric = String(row['Full NRIC'] ?? '').toUpperCase().trim();
        if (!nric) { failed++; continue; }
        const record: StoredInteraction = {
          id: this.nextId(),
          nricHash: hashNric(nric),
          interactionDetails: String(row['Interaction Details'] ?? '') || null,
          meetingDate: String(row['Meeting Date'] ?? '') || null,
          agency: String(row['Name of Agency/POC Staff'] ?? '').split('/').slice(1).join('/').trim() || null,
          pocStaffName: String(row['Name of Agency/POC Staff'] ?? '').split('/')[0]?.trim() || null,
          pocStaffEmail: String(row['Email of Agency/POC Staff'] ?? '') || null,
          briefNotes: String(row['Brief notes of meeting'] ?? '') || null,
        };
        this.interactions.push(record);
        inserted++;
      } catch { failed++; }
    }
    return { inserted, updated, failed };
  }

  upsertEvents(rows: Record<string, string | number | undefined>[]): { inserted: number; updated: number; failed: number } {
    let inserted = 0, updated = 0, failed = 0;
    for (const row of rows) {
      try {
        const nric = String(row['Full NRIC'] ?? '').toUpperCase().trim();
        if (!nric) { failed++; continue; }
        const record: StoredEvent = {
          id: this.nextId(),
          nricHash: hashNric(nric),
          eventTitle: String(row['Event Title'] ?? row['Other Event Name'] ?? ''),
          startDate: String(row['Event Start Date'] ?? '') || null,
          endDate: String(row['Event End Date'] ?? '') || null,
          description: String(row['Event Description'] ?? '') || null,
          organizerAgency: String(row['Programme Organizer/Agency-in-charge'] ?? '') || null,
          partners: String(row['Partners (co-organisers)'] ?? '') || null,
          eventType: String(row['Event Type'] ?? '') || null,
          aoiForEvent: String(row['Areas of Interest for the event'] ?? '') || null,
          roleOfYouth: String(row['Role of Youth in Programme'] ?? '') || null,
          attendance: String(row['Attendance'] ?? '') || null,
          briefNotes: String(row['Brief Notes on Youth Leader'] ?? '') || null,
          additionalNotes: String(row['Additional Notes'] ?? '') || null,
        };
        this.events.push(record);
        inserted++;
      } catch { failed++; }
    }
    return { inserted, updated, failed };
  }

  upsertAwards(rows: Record<string, string | number | undefined>[]): { inserted: number; updated: number; failed: number } {
    let inserted = 0, updated = 0, failed = 0;
    for (const row of rows) {
      try {
        const nric = String(row['Full NRIC'] ?? '').toUpperCase().trim();
        if (!nric) { failed++; continue; }
        const record: StoredAward = {
          id: this.nextId(),
          nricHash: hashNric(nric),
          year: row['Year of Awards and Recognition'] ? Number(row['Year of Awards and Recognition']) : null,
          awardName: String(row['Award Name & Description'] ?? ''),
          description: String(row['Award Name & Description'] ?? '') || null,
        };
        this.awards.push(record);
        inserted++;
      } catch { failed++; }
    }
    return { inserted, updated, failed };
  }

  upsertCommunity(rows: Record<string, string | number | undefined>[]): { inserted: number; updated: number; failed: number } {
    let inserted = 0, updated = 0, failed = 0;
    for (const row of rows) {
      try {
        const nric = String(row['Full NRIC'] ?? '').toUpperCase().trim();
        if (!nric) { failed++; continue; }
        const record: StoredCommunity = {
          id: this.nextId(),
          nricHash: hashNric(nric),
          startDate: String(row['Start Date'] ?? '') || null,
          endDate: String(row['End Date'] ?? '') || null,
          orgGroupName: String(row['Organisation or Group Name (if any)'] ?? '') || null,
          role: String(row['Role'] ?? '') || null,
          description: String(row['Description of Experience'] ?? '') || null,
        };
        this.community.push(record);
        inserted++;
      } catch { failed++; }
    }
    return { inserted, updated, failed };
  }

  upsertOverseas(rows: Record<string, string | number | undefined>[]): { inserted: number; updated: number; failed: number } {
    let inserted = 0, updated = 0, failed = 0;
    for (const row of rows) {
      try {
        const nric = String(row['Full NRIC'] ?? '').toUpperCase().trim();
        if (!nric) { failed++; continue; }
        const record: StoredOverseas = {
          id: this.nextId(),
          nricHash: hashNric(nric),
          year: row['Year of Overseas Representation for Singapore/Agencies'] ? Number(row['Year of Overseas Representation for Singapore/Agencies']) : null,
          description: String(row['Description'] ?? '') || null,
        };
        this.overseasRepresentation.push(record);
        inserted++;
      } catch { failed++; }
    }
    return { inserted, updated, failed };
  }

  processUpload(tableTarget: string, rows: Record<string, string | number | undefined>[], fileName: string): UploadRecord {
    let result: { inserted: number; updated: number; failed: number };

    switch (tableTarget) {
      case 'profiles': result = this.upsertProfiles(rows); break;
      case 'relationship_managers': result = this.upsertRelationshipManagers(rows); break;
      case 'areas_of_interest': result = this.upsertAreasOfInterest(rows); break;
      case 'interactions': result = this.upsertInteractions(rows); break;
      case 'events': result = this.upsertEvents(rows); break;
      case 'awards': result = this.upsertAwards(rows); break;
      case 'community': result = this.upsertCommunity(rows); break;
      case 'overseas_representation': result = this.upsertOverseas(rows); break;
      default: throw new Error(`Unknown table target: ${tableTarget}`);
    }

    const record: UploadRecord = {
      id: crypto.randomUUID(),
      fileName,
      tableTarget,
      rowCount: rows.length,
      rowsInserted: result.inserted,
      rowsUpdated: result.updated,
      rowsFailed: result.failed,
      status: result.failed === rows.length ? 'failed' : 'completed',
      createdAt: new Date().toISOString(),
    };

    this.uploadHistory.unshift(record);
    return record;
  }

  reset(): void {
    this.profiles = [];
    this.relationshipManagers = [];
    this.areasOfInterest = [];
    this.interactions = [];
    this.events = [];
    this.awards = [];
    this.community = [];
    this.overseasRepresentation = [];
    this.uploadHistory = [];
    this._hydrated = false;
    this._hydrating = null;
  }

  private _hydrated = false;
  private _hydrating: Promise<void> | null = null;

  async hydrate(): Promise<void> {
    if (this._hydrated) return;
    if (this._hydrating) return this._hydrating;
    this._hydrating = this._doHydrate();
    return this._hydrating;
  }

  private async _doHydrate(): Promise<void> {
    try {
      const dbProfiles = await db.select().from(schema.profiles);
      if (dbProfiles.length === 0) {
        this._hydrated = true;
        return;
      }

      for (const p of dbProfiles) {
        if (this.profiles.find(ep => ep.nricHash === p.nricHash)) continue;
        this.profiles.push({
          id: p.id,
          nricHash: p.nricHash,
          nricMasked: `****${p.nricHash.slice(-4).toUpperCase()}`,
          fullName: p.fullName,
          caseId: p.caseId,
          caseStatus: p.caseStatus,
          race: p.race,
          sex: p.sex,
          email: p.email,
          mobileNumber: p.mobileNumber,
          residentialStatus: p.residentialStatus,
          yearOfBirth: p.yearOfBirth,
          employerOrg: p.employerOrg,
          designation: p.designation,
          dataConsent: p.dataConsent ?? false,
          linkedinHandle: p.linkedinHandle,
          writeUp: p.writeUp,
          reasonForNomination: p.reasonForNomination,
          areasOfInterest: null,
          rmDetails: p.rmDetails,
          sourceAgency: p.sourceAgency,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        });
      }

      const dbRMs = await db.select().from(schema.relationshipManagers);
      for (const rm of dbRMs) {
        if (this.relationshipManagers.find(e => e.email === rm.email)) continue;
        this.relationshipManagers.push({
          id: rm.id,
          rmId: rm.rmId,
          name: rm.name,
          email: rm.email,
          agency: rm.agency,
        });
      }

      const dbAOI = await db.select().from(schema.areasOfInterest);
      for (const a of dbAOI) {
        this.areasOfInterest.push({
          id: a.id,
          nricHash: a.nricHash,
          aoiId: a.aoiId,
          areaOfInterest: a.areaOfInterest,
          alignment: a.alignment,
          levelOfInterest: a.levelOfInterest,
          levelOfInfluence: a.levelOfInfluence,
          agency: a.agency,
        });
      }

      const dbInteractions = await db.select().from(schema.interactions);
      for (const i of dbInteractions) {
        this.interactions.push({
          id: i.id,
          nricHash: i.nricHash,
          interactionDetails: i.interactionDetails,
          meetingDate: i.meetingDate,
          agency: i.agency,
          pocStaffName: i.pocStaffName,
          pocStaffEmail: i.pocStaffEmail,
          briefNotes: i.briefNotes,
        });
      }

      const dbEvents = await db.select().from(schema.events);
      for (const e of dbEvents) {
        this.events.push({
          id: e.id,
          nricHash: e.nricHash,
          eventTitle: e.eventTitle,
          startDate: e.startDate,
          endDate: e.endDate,
          description: e.description,
          organizerAgency: e.organizerAgency,
          partners: e.partners,
          eventType: e.eventType,
          aoiForEvent: e.aoiForEvent,
          roleOfYouth: e.roleOfYouth,
          attendance: e.attendance,
          briefNotes: e.briefNotes,
          additionalNotes: e.additionalNotes,
        });
      }

      const dbAwards = await db.select().from(schema.awards);
      for (const a of dbAwards) {
        this.awards.push({
          id: a.id,
          nricHash: a.nricHash,
          year: a.year,
          awardName: a.awardName,
          description: a.description,
        });
      }

      const dbCommunity = await db.select().from(schema.community);
      for (const c of dbCommunity) {
        this.community.push({
          id: c.id,
          nricHash: c.nricHash,
          startDate: c.startDate,
          endDate: c.endDate,
          orgGroupName: c.orgGroupName,
          role: c.role,
          description: c.description,
        });
      }

      const dbOverseas = await db.select().from(schema.overseasRepresentation);
      for (const o of dbOverseas) {
        this.overseasRepresentation.push({
          id: o.id,
          nricHash: o.nricHash,
          year: o.year,
          description: o.description,
        });
      }

      console.log(`[DataStore] Hydrated from DB: ${this.profiles.length} profiles, ${this.interactions.length} interactions, ${this.events.length} events`);
    } catch (err) {
      console.error('[DataStore] DB hydration failed (store will remain empty):', err);
    }
    this._hydrated = true;
  }
}

// Singleton - persists across hot reloads in dev via globalThis
const globalStore = globalThis as unknown as { __dataStore?: DataStore };
if (!globalStore.__dataStore) {
  globalStore.__dataStore = new DataStore();
}
export const dataStore = globalStore.__dataStore;

export async function getHydratedStore(): Promise<DataStore> {
  if (getDataMode() === 'test') {
    await dataStore.hydrate();
  }
  return dataStore;
}
