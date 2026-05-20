import { z } from 'zod';

const nricField = z.string().regex(/^[STFGM]\d{7}[A-Z]$/i, 'Invalid NRIC format');
const optionalString = z.string().optional().or(z.literal(''));
const optionalDate = z.string().optional().or(z.literal(''));
const optionalNumber = z.union([z.coerce.number(), z.literal(''), z.undefined()]).optional();

export const profileRowSchema = z.object({
  'Full NRIC': nricField,
  'Full Name': z.string().min(1, 'Name is required'),
  'Case ID': optionalString,
  'Case Status': optionalString,
  'Race': optionalString,
  'Sex': optionalString,
  'Email Address': optionalString,
  'Mobile Number': optionalString,
  'Residential Status': optionalString,
  'Year of Birth': optionalNumber,
  'Name of Employer/Organisation': optionalString,
  'Designation': optionalString,
  'Data Consent': optionalString,
  'LinkedIn Handle': optionalString,
  'Write-up on the Individual': optionalString,
  'Reason for Nomination': optionalString,
  'Area(s) of Interest': optionalString,
  'Relationship Manager (RM) Details': optionalString,
});

export const rmRowSchema = z.object({
  'RM ID': optionalString,
  'Relationship Manager': z.string().min(1, 'RM name is required'),
  'Relationship Manager Email': z.string().email('Invalid email'),
  'Agency': z.string().min(1, 'Agency is required'),
});

export const aoiRowSchema = z.object({
  'Full NRIC': nricField,
  'AOI ID': optionalString,
  'Area of Interest': z.string().min(1, 'Area of interest is required'),
  'Alignment': optionalString,
  'Level of Interest': optionalString,
  'Level of Influence': optionalString,
  'Agency': optionalString,
});

export const interactionRowSchema = z.object({
  'Full NRIC': nricField,
  'Interaction Details': optionalString,
  'Meeting Date': optionalDate,
  'Name of Agency/POC Staff': optionalString,
  'Email of Agency/POC Staff': optionalString,
  'Brief notes of meeting': optionalString,
});

export const eventRowSchema = z.object({
  'Full NRIC': nricField,
  'Event Title': z.string().min(1, 'Event title is required'),
  'Event Start Date': optionalDate,
  'Event End Date': optionalDate,
  'Event Description': optionalString,
  'Programme Organizer/Agency-in-charge': optionalString,
  'Partners (co-organisers)': optionalString,
  'Event Type': optionalString,
  'Areas of Interest for the event': optionalString,
  'Role of Youth in Programme': optionalString,
  'Attendance': optionalString,
  'Brief Notes on Youth Leader': optionalString,
  'Additional Notes': optionalString,
});

export const awardRowSchema = z.object({
  'Full NRIC': nricField,
  'Year of Awards and Recognition': optionalNumber,
  'Award Name & Description': z.string().min(1, 'Award name is required'),
});

export const communityRowSchema = z.object({
  'Full NRIC': nricField,
  'Start Date': optionalDate,
  'End Date': optionalDate,
  'Organisation or Group Name (if any)': optionalString,
  'Role': optionalString,
  'Description of Experience': optionalString,
});

export const overseasRowSchema = z.object({
  'Full NRIC': nricField,
  'Year of Overseas Representation for Singapore/Agencies': optionalNumber,
  'Description': optionalString,
});

export const CSV_SCHEMAS = {
  profiles: profileRowSchema,
  relationship_managers: rmRowSchema,
  areas_of_interest: aoiRowSchema,
  interactions: interactionRowSchema,
  events: eventRowSchema,
  awards: awardRowSchema,
  community: communityRowSchema,
  overseas_representation: overseasRowSchema,
} as const;
