import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT_DIR = join(import.meta.dirname, '..', 'sample-data');
mkdirSync(OUT_DIR, { recursive: true });

const AGENCIES = [
  'Ministry of Culture, Community and Youth (MCCY)',
  'National Youth Council (NYC)',
  "People's Association (PA)",
  'Ministry of Education (MOE)',
  'Ministry of Social and Family Development (MSF)',
];

const AREAS_OF_INTEREST = [
  'Youth Mental Health', 'Climate Action', 'Digital Literacy',
  'Community Service', 'Arts & Culture', 'Sports & Wellness',
  'Social Entrepreneurship', 'Civic Participation',
  'Racial Harmony', 'Interfaith Dialogue', 'Sustainability',
  'Innovation & Technology', 'Volunteerism', 'Heritage Conservation',
];

const EVENT_TITLES = [
  'Singapore Youth Festival 2025', 'National Day Parade Youth Contingent',
  'Youth Corps Leaders Programme', 'ASEAN Youth Summit 2025',
  'Green Plan Youth Dialogue', 'Youth Action Challenge',
  'SG Youth Model UN', 'National Youth Achievement Award Ceremony',
  'Forward SG Youth Engagement', 'Youth Mental Wellness Conference',
  'Racial Harmony Day Celebration', 'Digital Skills Bootcamp',
  'Youth Volunteerism Summit', 'Climate Rally SG',
  'Community Leadership Workshop', 'Arts & Culture Youth Forum',
  'Social Enterprise Pitch Day', 'Youth Innovation Hackathon',
  'Heritage Trail Youth Programme', 'Interfaith Youth Dialogue 2025',
];

const AWARD_NAMES = [
  'National Youth Achievement Award (Gold)', "President's Award for Volunteerism",
  'Singapore Youth Award', 'NYP Outstanding Youth Leader',
  'ASEAN Youth Fellowship', 'Youth ChangeMaker Award',
  'Community Champion Award', 'Green Youth Champion Award',
];

const ORGANISATIONS = [
  'Youth Corps Singapore', 'Red Cross Youth',
  "Boys' Brigade Singapore", 'Girl Guides Singapore',
  'Halogen Foundation', 'TOUCH Community Services',
  'YMCA Singapore', 'Habitat for Humanity Singapore',
  'Singapore International Foundation', 'Youth Mental Health Alliance',
  'Climate Action SG', 'Digital for Life Movement',
];

const FIRST_NAMES_M = ['Wei Jie', 'Jun Wei', 'Zhi Hao', 'Yi Xuan', 'Kai Wen', 'Ahmad', 'Muhammad', 'Ravi', 'Arjun', 'Daniel', 'Joshua', 'Ryan', 'Marcus', 'Ethan', 'Brandon'];
const FIRST_NAMES_F = ['Xin Yi', 'Jia Ying', 'Hui Min', 'Siti', 'Nurul', 'Priya', 'Ananya', 'Rachel', 'Sarah', 'Michelle', 'Chloe', 'Natalie', 'Grace', 'Emily', 'Jasmine'];
const LAST_NAMES = ['Tan', 'Lim', 'Lee', 'Wong', 'Ng', 'Goh', 'Chua', 'Koh', 'Ong', 'Teo', 'Ibrahim', 'Rashid', 'Abdullah', 'Nair', 'Kumar', 'Singh', 'Chen', 'Zhang', 'Liu', 'Wang'];
const RACES = ['Chinese', 'Chinese', 'Chinese', 'Malay', 'Malay', 'Indian', 'Indian', 'Eurasian', 'Others'];
const STATUSES = ['Nominated', 'Active', 'Active', 'Active', 'Champion', 'Advocate', 'Dormant'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function nric(): string {
  const prefix = Math.random() > 0.3 ? 'S' : 'T';
  const digits = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('');
  const letters = 'ABCDEFGHJKLMNPQRSTUWXYZ';
  return `${prefix}${digits}${letters[parseInt(digits) % letters.length]}`;
}
function dateStr(yearStart: number, yearEnd: number): string {
  const y = randInt(yearStart, yearEnd);
  const m = randInt(1, 12);
  const d = randInt(1, 28);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function toCsv(headers: string[], rows: string[][]): string {
  const escape = (s: string) => s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

// Generate 200 profiles
const profiles: { nric: string; name: string; sex: string; race: string; agency: string; status: string }[] = [];
const profileRows: string[][] = [];

for (let i = 0; i < 200; i++) {
  const sex = Math.random() > 0.5 ? 'Male' : 'Female';
  const firstName = sex === 'Male' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const race = pick(RACES);
  const id = nric();
  const agency = pick(AGENCIES);
  const status = pick(STATUSES);
  const yob = randInt(1990, 2005);

  profiles.push({ nric: id, name, sex, race, agency, status });

  profileRows.push([
    id, name, `CASE-${String(i + 1).padStart(4, '0')}`, status,
    race, sex, `${firstName.toLowerCase().replace(/ /g, '')}@email.com`,
    `+65${randInt(80000000, 99999999)}`, 'Singapore Citizen',
    String(yob), pick(['NUS', 'NTU', 'SMU', 'SUTD', 'SIT', 'NYP', 'TP', 'Google', 'DBS', 'Grab', '']),
    pick(['Student', 'Executive', 'Manager', 'Volunteer Coordinator', 'Social Worker', '']),
    Math.random() > 0.2 ? 'Yes' : 'No', '',
    `Passionate about ${pick(AREAS_OF_INTEREST).toLowerCase()}. Active in community development since ${yob + 16}.`,
    `Nominated for outstanding contributions in ${pick(AREAS_OF_INTEREST).toLowerCase()}.`,
    pickN(AREAS_OF_INTEREST, randInt(1, 3)).join('; '),
    '',
  ]);
}

const profileHeaders = [
  'Full NRIC', 'Full Name', 'Case ID', 'Case Status', 'Race', 'Sex',
  'Email Address', 'Mobile Number', 'Residential Status', 'Year of Birth',
  'Name of Employer/Organisation', 'Designation', 'Data Consent', 'LinkedIn Handle',
  'Write-up on the Individual', 'Reason for Nomination', 'Area(s) of Interest',
  'Relationship Manager (RM) Details',
];
writeFileSync(join(OUT_DIR, 'profiles.csv'), toCsv(profileHeaders, profileRows));

// Relationship Managers (15)
const rmRows: string[][] = [];
const rmNames = ['Sarah Tan', 'Ahmad Ibrahim', 'Priya Nair', 'David Lim', 'Rachel Wong',
  'Wei Ming Koh', 'Farah Abdullah', 'Lakshmi Kumar', 'Jason Ong', 'Michelle Goh',
  'Hafiz Rashid', 'Anita Singh', 'Brandon Lee', 'Siti Aminah', 'Kenneth Teo'];
for (let i = 0; i < 15; i++) {
  const agency = AGENCIES[i % 5];
  rmRows.push([
    `RM-${String(i + 1).padStart(3, '0')}`,
    rmNames[i],
    `${rmNames[i].toLowerCase().replace(/ /g, '.')}@gov.sg`,
    agency,
  ]);
}
writeFileSync(join(OUT_DIR, 'relationship-managers.csv'), toCsv(
  ['RM ID', 'Relationship Manager', 'Relationship Manager Email', 'Agency'],
  rmRows
));

// Areas of Interest (400, ~2 per stakeholder)
const aoiRows: string[][] = [];
for (const p of profiles) {
  const aois = pickN(AREAS_OF_INTEREST, randInt(1, 3));
  for (const aoi of aois) {
    aoiRows.push([
      p.nric, `AOI-${aoiRows.length + 1}`, aoi,
      pick(['National', 'Regional', 'Community']),
      pick(['Low', 'Medium', 'High']),
      pick(['Low', 'Medium', 'High']),
      Math.random() > 0.3 ? p.agency : pick(AGENCIES),
    ]);
  }
}
writeFileSync(join(OUT_DIR, 'areas-of-interest.csv'), toCsv(
  ['Full NRIC', 'AOI ID', 'Area of Interest', 'Alignment', 'Level of Interest', 'Level of Influence', 'Agency'],
  aoiRows
));

// Interactions (600)
const interactionRows: string[][] = [];
for (let i = 0; i < 600; i++) {
  const p = profiles[i % 200];
  const rm = rmNames[randInt(0, 14)];
  const date = dateStr(2023, 2026);
  interactionRows.push([
    p.nric,
    `${pick(['Phone call', 'In-person meeting', 'Virtual meeting', 'Email exchange', 'Workshop'])} with ${p.name}`,
    date,
    `${rm} / ${pick(AGENCIES)}`,
    `${rm.toLowerCase().replace(/ /g, '.')}@gov.sg`,
    `Discussed ${pick(AREAS_OF_INTEREST).toLowerCase()} initiatives. ${pick(['Follow-up scheduled.', 'Action items noted.', 'Positive engagement.', 'Referred to partner agency.'])}`,
  ]);
}
writeFileSync(join(OUT_DIR, 'interactions.csv'), toCsv(
  ['Full NRIC', 'Interaction Details', 'Meeting Date', 'Name of Agency/POC Staff', 'Email of Agency/POC Staff', 'Brief notes of meeting'],
  interactionRows
));

// Events (300 attendance records across 20 events)
const eventRows: string[][] = [];
for (const event of EVENT_TITLES) {
  const attendees = pickN(profiles, randInt(5, 20));
  const startDate = dateStr(2024, 2026);
  const organizer = pick(AGENCIES);
  for (const p of attendees) {
    eventRows.push([
      p.nric, event, startDate, startDate,
      `Annual ${event.toLowerCase()} bringing together youth leaders from across Singapore.`,
      organizer, pick(AGENCIES),
      pick(['Conference', 'Workshop', 'Dialogue', 'Competition', 'Community Service']),
      pick(AREAS_OF_INTEREST),
      pick(['Participant', 'Speaker', 'Organizer', 'Volunteer', 'Panelist']),
      pick(['Attended', 'Attended', 'Attended', 'No-Show']),
      `${p.name} actively participated in the event.`,
      '',
    ]);
  }
}
writeFileSync(join(OUT_DIR, 'events.csv'), toCsv(
  ['Full NRIC', 'Event Title', 'Event Start Date', 'Event End Date', 'Event Description',
   'Programme Organizer/Agency-in-charge', 'Partners (co-organisers)', 'Event Type',
   'Areas of Interest for the event', 'Role of Youth in Programme', 'Attendance',
   'Brief Notes on Youth Leader', 'Additional Notes'],
  eventRows
));

// Awards (60)
const awardRows: string[][] = [];
const awardees = pickN(profiles, 60);
for (const p of awardees) {
  awardRows.push([
    p.nric, String(randInt(2022, 2026)), pick(AWARD_NAMES),
  ]);
}
writeFileSync(join(OUT_DIR, 'awards.csv'), toCsv(
  ['Full NRIC', 'Year of Awards and Recognition', 'Award Name & Description'],
  awardRows
));

// Community (150)
const communityRows: string[][] = [];
const communityMembers = pickN(profiles, 120);
for (const p of communityMembers) {
  const roles = randInt(1, 2);
  for (let r = 0; r < roles; r++) {
    communityRows.push([
      p.nric, dateStr(2020, 2024), Math.random() > 0.4 ? dateStr(2025, 2026) : '',
      pick(ORGANISATIONS),
      pick(['Member', 'Volunteer', 'Committee Member', 'Vice President', 'President', 'Secretary']),
      `Active involvement in ${pick(AREAS_OF_INTEREST).toLowerCase()} initiatives.`,
    ]);
  }
}
writeFileSync(join(OUT_DIR, 'community.csv'), toCsv(
  ['Full NRIC', 'Start Date', 'End Date', 'Organisation or Group Name (if any)', 'Role', 'Description of Experience'],
  communityRows
));

// Overseas Representation (40)
const overseasRows: string[][] = [];
const overseasPeople = pickN(profiles, 40);
for (const p of overseasPeople) {
  overseasRows.push([
    p.nric, String(randInt(2022, 2026)),
    `Represented Singapore at ${pick(['ASEAN Youth Forum', 'UN Youth Assembly', 'Commonwealth Youth Council', 'G20 Youth Summit', 'Asia-Pacific Youth Exchange'])} in ${pick(['Bangkok', 'New York', 'London', 'Tokyo', 'Seoul', 'Jakarta'])}`,
  ]);
}
writeFileSync(join(OUT_DIR, 'overseas-representation.csv'), toCsv(
  ['Full NRIC', 'Year of Overseas Representation for Singapore/Agencies', 'Description'],
  overseasRows
));

console.log('Sample data generated:');
console.log(`  profiles.csv: ${profileRows.length} rows`);
console.log(`  relationship-managers.csv: ${rmRows.length} rows`);
console.log(`  areas-of-interest.csv: ${aoiRows.length} rows`);
console.log(`  interactions.csv: ${interactionRows.length} rows`);
console.log(`  events.csv: ${eventRows.length} rows`);
console.log(`  awards.csv: ${awardRows.length} rows`);
console.log(`  community.csv: ${communityRows.length} rows`);
console.log(`  overseas-representation.csv: ${overseasRows.length} rows`);
