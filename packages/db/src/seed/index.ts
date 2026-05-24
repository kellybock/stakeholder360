import { dbTest as db } from '../client';
import * as schema from '../schema';
import { createHash } from 'crypto';

function hashNric(nric: string): string {
  return createHash('sha256').update(nric).digest('hex');
}
function encryptNric(nric: string): Buffer {
  return Buffer.from(nric, 'utf-8');
}
function date(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return min + Math.floor(Math.random() * (max - min + 1)); }

const AGENCIES = ['MCCY', 'NYC', 'MOE', 'MSF', 'MINDEF', 'MHA'] as const;

async function seed() {
  console.log('Clearing existing data...');
  await db.delete(schema.engagementScores);
  await db.delete(schema.stakeholderEmbeddings);
  await db.delete(schema.areasOfInterest);
  await db.delete(schema.awards);
  await db.delete(schema.community);
  await db.delete(schema.events);
  await db.delete(schema.interactions);
  await db.delete(schema.overseasRepresentation);
  await db.delete(schema.aiConversations);
  await db.delete(schema.uploadHistory);
  await db.delete(schema.sessions);
  await db.delete(schema.relationshipManagers);
  await db.delete(schema.profiles);
  await db.delete(schema.users);

  // ─── USERS ────────────────────────────────────────────────
  console.log('Seeding users...');
  const users = await db.insert(schema.users).values([
    { email: 'admin@youth360.gov.sg', fullName: 'Lim Wei Ming', agency: 'MCCY', role: 'admin', passwordHash: '$2a$10$dummyhashforadminuser1234567890abc' },
    { email: 'sarah.tan@nyc.gov.sg', fullName: 'Sarah Tan', agency: 'NYC', role: 'rm', passwordHash: '$2a$10$dummyhashforsarahtan1234567890abc' },
    { email: 'raj.kumar@mccy.gov.sg', fullName: 'Raj Kumar', agency: 'MCCY', role: 'rm', passwordHash: '$2a$10$dummyhashforrajkumar234567890abcd' },
    { email: 'chen.li@moe.gov.sg', fullName: 'Chen Li Hua', agency: 'MOE', role: 'rm', passwordHash: '$2a$10$dummyhashforchenlih1234567890abce' },
    { email: 'ahmad.ibrahim@msf.gov.sg', fullName: 'Ahmad Ibrahim', agency: 'MSF', role: 'rm', passwordHash: '$2a$10$dummyhashforahmadib234567890abcde' },
    { email: 'tanwl@mindef.gov.sg', fullName: 'Tan Wei Lin', agency: 'MINDEF', role: 'rm', passwordHash: '$2a$10$dummyhashfortanweilin34567890abcde' },
    { email: 'viewer@youth360.gov.sg', fullName: 'Priya Nair', agency: 'NYC', role: 'viewer', passwordHash: '$2a$10$dummyhashforpriyanaira567890abcdef' },
  ]).returning();

  const [admin, sarah, raj, chenli, ahmad, tanwl] = users;
  const rmUsers = [sarah, raj, chenli, ahmad, tanwl];

  // ─── 50 PROFILES ──────────────────────────────────────────
  // Statuses: Champion (top), Advocate, Active, Nominated, Inactive, Dormant
  const profileDefs: { fullName: string; race: string; sex: string; email: string; yearOfBirth: number; employerOrg: string; designation: string; sourceAgency: string; caseStatus: string; writeUp: string; reasonForNomination: string }[] = [
    // Champions — highly engaged, multi-agency
    { fullName: 'Aisha Binte Rahman', race: 'Malay', sex: 'F', email: 'aisha.rahman@gmail.com', yearOfBirth: 1999, employerOrg: 'DBS Bank', designation: 'Associate', sourceAgency: 'NYC', caseStatus: 'Champion', writeUp: 'Aisha is an exceptional youth advocate who has been instrumental in organizing community dialogues on mental health, bridging public-private partnerships for youth well-being programmes, and mentoring emerging youth leaders across multiple agencies.', reasonForNomination: 'Consistently leads inter-agency youth engagement initiatives with measurable impact on policy outcomes.' },
    { fullName: 'Kevin Teo Jun Wei', race: 'Chinese', sex: 'M', email: 'kevin.teo@govtech.gov.sg', yearOfBirth: 1998, employerOrg: 'GovTech', designation: 'Software Engineer', sourceAgency: 'MCCY', caseStatus: 'Champion', writeUp: 'Kevin drives digital literacy programs across heartland communities, building tech tools used by 3 agencies to track youth engagement metrics. He bridges the tech-policy gap effectively.', reasonForNomination: 'Built the Youth Engagement Tracker used across MCCY, NYC, and MOE; trained 200+ civil servants on youth data analytics.' },
    { fullName: 'Rachel Ng Mei Ling', race: 'Chinese', sex: 'F', email: 'rachel.ng@deloitte.com', yearOfBirth: 2000, employerOrg: 'Deloitte', designation: 'Consultant', sourceAgency: 'NYC', caseStatus: 'Champion', writeUp: 'Rachel founded Social Spark, an initiative supporting 50+ youth-led social enterprises. She connects corporate resources with youth entrepreneurs across agencies and has raised over $2M in social impact funding.', reasonForNomination: 'Pioneer of youth social entrepreneurship ecosystem in Singapore; advisory panel member for NYC and MCCY.' },
    { fullName: 'Jessica Wong Hui Min', race: 'Chinese', sex: 'F', email: 'jessica.wong@ycs.org.sg', yearOfBirth: 1999, employerOrg: 'Youth Corps Singapore', designation: 'Programme Director', sourceAgency: 'MCCY', caseStatus: 'Champion', writeUp: 'Jessica manages large-scale volunteer deployments connecting 5,000+ youth annually with community needs. She designed the national youth volunteerism framework now adopted by 4 agencies.', reasonForNomination: 'Architected the National Youth Volunteerism Framework; mobilized record 5,000 volunteers for SG Cares 2025.' },

    // Advocates — strong engagement, growing influence
    { fullName: 'Priya Devi', race: 'Indian', sex: 'F', email: 'priya.devi@nus.edu.sg', yearOfBirth: 2001, employerOrg: 'NUS', designation: 'PhD Candidate', sourceAgency: 'MOE', caseStatus: 'Advocate', writeUp: 'Priya is a sustainability champion who led Project Green Wave reaching 15,000 students across 30 schools. She now researches youth climate policy for her PhD and advises MOE on green curriculum.', reasonForNomination: 'Led Project Green Wave; authored green curriculum recommendations adopted by MOE for 2026.' },
    { fullName: 'Muhammad Irfan', race: 'Malay', sex: 'M', email: 'irfan.m@mccy.gov.sg', yearOfBirth: 1997, employerOrg: 'MCCY', designation: 'Senior Policy Analyst', sourceAgency: 'MCCY', caseStatus: 'Advocate', writeUp: 'Irfan specializes in arts and culture policy for youth. His engagement framework has been adopted by 3 agencies. He bridges policy research with on-the-ground community insights.', reasonForNomination: 'Authored youth arts engagement framework adopted by MCCY, NYC, PA; selected for PM Office youth policy fellowship.' },
    { fullName: 'Ryan Koh Zhi Hao', race: 'Chinese', sex: 'M', email: 'ryan.koh@grab.com', yearOfBirth: 1998, employerOrg: 'Grab', designation: 'Senior Data Analyst', sourceAgency: 'NYC', caseStatus: 'Advocate', writeUp: 'Ryan built an analytics dashboard tracking youth engagement outcomes across agencies. His data-driven approach has improved programme targeting and reduced resource waste by 30%.', reasonForNomination: 'Youth Engagement Analytics Dashboard now used by 4 agencies; reduced programme overlap by 30%.' },
    { fullName: 'Emily Chen Jia Ying', race: 'Chinese', sex: 'F', email: 'emily.chen@nus.edu.sg', yearOfBirth: 2001, employerOrg: 'NUS College', designation: 'Research Fellow', sourceAgency: 'MOE', caseStatus: 'Advocate', writeUp: 'Emily leads the SG Youth Climate Coalition which presented policy recommendations directly to Parliament. She coordinates university-level sustainability efforts across 6 institutions.', reasonForNomination: 'Led SG Youth Climate Coalition policy paper; youngest invitee to Parliament Select Committee on Sustainability.' },
    { fullName: 'Vikram Nair', race: 'Indian', sex: 'M', email: 'vikram.nair@pwc.com', yearOfBirth: 1998, employerOrg: 'PwC Singapore', designation: 'Manager', sourceAgency: 'NYC', caseStatus: 'Advocate', writeUp: 'Vikram drives financial literacy programmes reaching 8,000+ students across 20 schools annually. His MoneyWise Youth programme has been endorsed by MAS and adopted as supplementary curriculum.', reasonForNomination: 'MoneyWise Youth programme endorsed by MAS; reached 8,000 students; expanding to ASEAN in 2026.' },

    // Active — regular engagement, solid contributors
    { fullName: 'Darren Lim Kah Hoe', race: 'Chinese', sex: 'M', email: 'darren.lim@smu.edu.sg', yearOfBirth: 2001, employerOrg: 'SMU', designation: 'Final Year Student', sourceAgency: 'MOE', caseStatus: 'Active', writeUp: 'Darren spearheads cross-university mental wellness collaboration. He organized the National Youth Mental Wellness Summit with 800 attendees.', reasonForNomination: 'Organized National Youth Mental Wellness Summit 2025 (800 attendees); created peer support network across 5 universities.' },
    { fullName: 'Nurul Huda', race: 'Malay', sex: 'F', email: 'nurul.huda@ntu.edu.sg', yearOfBirth: 2002, employerOrg: 'NTU', designation: 'Honours Student', sourceAgency: 'MCCY', caseStatus: 'Active', writeUp: 'Nurul facilitates interfaith dialogue building bridges among youth of different backgrounds. Her SG Youth Harmony Programme has 500+ alumni.', reasonForNomination: 'SG Youth Harmony Programme with 500+ alumni; invited as facilitator for National Day Rally youth segment.' },
    { fullName: 'Fatimah Zahra', race: 'Malay', sex: 'F', email: 'fatimah.z@np.edu.sg', yearOfBirth: 2003, employerOrg: 'Ngee Ann Polytechnic', designation: 'Final Year Student', sourceAgency: 'MOE', caseStatus: 'Active', writeUp: 'Fatimah champions Malay performing arts in modern Singapore. Her SG Youth Arts Festival attracted 3,000+ attendees.', reasonForNomination: 'SG Youth Arts Festival (3,000 attendees); commissioned by MCCY for National Day performance.' },
    { fullName: 'Liang Xiao Wen', race: 'Chinese', sex: 'F', email: 'xiaowen.liang@nvpc.org.sg', yearOfBirth: 2000, employerOrg: 'NVPC', designation: 'Senior Coordinator', sourceAgency: 'MSF', caseStatus: 'Active', writeUp: 'Xiao Wen coordinates cross-sector youth volunteerism focusing on elderly care. Her intergenerational programme runs in 10 RCs.', reasonForNomination: 'Intergenerational programme in 10 RCs; selected for MSF Innovation Award 2025.' },
    { fullName: 'Cheryl Ong Siew Hua', race: 'Chinese', sex: 'F', email: 'cheryl.ong@suss.edu.sg', yearOfBirth: 2001, employerOrg: 'SUSS', designation: 'MSW Student', sourceAgency: 'MSF', caseStatus: 'Active', writeUp: 'Cheryl leads youth-at-risk mentoring programmes. Her peer mentoring network supports 200+ at-risk youths.', reasonForNomination: 'Peer mentoring network supporting 200+ at-risk youths; published research on youth resilience interventions.' },
    { fullName: 'Hafiz Bin Omar', race: 'Malay', sex: 'M', email: 'hafiz.omar@sp.edu.sg', yearOfBirth: 2002, employerOrg: 'Singapore Polytechnic', designation: 'Graduate', sourceAgency: 'MCCY', caseStatus: 'Active', writeUp: 'Hafiz is a sports and fitness youth ambassador. His FitSG Youth movement has 1,500+ active participants across heartland communities.', reasonForNomination: 'FitSG Youth movement (1,500 participants); appointed Sport SG Youth Ambassador.' },
    { fullName: 'Siti Aminah', race: 'Malay', sex: 'F', email: 'siti.aminah@mendaki.org.sg', yearOfBirth: 1999, employerOrg: 'MENDAKI', designation: 'Senior Programme Executive', sourceAgency: 'MCCY', caseStatus: 'Active', writeUp: 'Siti focuses on Malay/Muslim community empowerment through youth development. Her YouthBridge programme connects 300 youth with industry mentors.', reasonForNomination: 'YouthBridge mentoring programme (300 youth-mentor pairs); co-designed MENDAKI youth strategy 2025-2030.' },
    { fullName: 'Shanmugam Ravi', race: 'Indian', sex: 'M', email: 's.ravi@sutd.edu.sg', yearOfBirth: 2000, employerOrg: 'SUTD', designation: 'Teaching Assistant', sourceAgency: 'MOE', caseStatus: 'Active', writeUp: 'Ravi evangelizes design thinking among polytechnic and university students. His DesignSprint SG produced 12 community innovation prototypes now piloted.', reasonForNomination: 'DesignSprint SG (12 prototypes, 3 now in pilot); innovation curriculum consultant for MOE.' },

    // Nominated — new stakeholders being onboarded
    { fullName: 'Isabelle Tan Jing Yi', race: 'Chinese', sex: 'F', email: 'isabelle.tan@nus.edu.sg', yearOfBirth: 2003, employerOrg: 'NUS', designation: 'Year 3 Student', sourceAgency: 'MOE', caseStatus: 'Nominated', writeUp: 'Isabelle founded the NUS Youth Policy Lab, a student-run think tank producing policy briefs on education and youth employment.', reasonForNomination: 'Founded NUS Youth Policy Lab; published 3 policy briefs adopted by MOE as discussion papers.' },
    { fullName: 'Zulkifli Bin Ahmad', race: 'Malay', sex: 'M', email: 'zulkifli.a@rp.edu.sg', yearOfBirth: 2004, employerOrg: 'Republic Polytechnic', designation: 'Year 2 Student', sourceAgency: 'MCCY', caseStatus: 'Nominated', writeUp: 'Zulkifli is a rising media producer creating youth-focused documentaries on community issues. His series "Our Heartlands" went viral on social media.', reasonForNomination: 'Documentary series "Our Heartlands" (500K views); nominated by MCCY as emerging youth voice.' },
    { fullName: 'Ananya Krishnan', race: 'Indian', sex: 'F', email: 'ananya.k@ntu.edu.sg', yearOfBirth: 2003, employerOrg: 'NTU', designation: 'Year 2 Student', sourceAgency: 'MOE', caseStatus: 'Nominated', writeUp: 'Ananya leads NTU\'s social innovation club, connecting engineering students with community challenges. Her team\'s assistive tech project won the President\'s Design Award (Student).', reasonForNomination: 'President\'s Design Award (Student category); assistive tech project now used in 3 eldercare centres.' },
    { fullName: 'Marcus Lee Wei Xiang', race: 'Chinese', sex: 'M', email: 'marcus.lee@sit.edu.sg', yearOfBirth: 2002, employerOrg: 'SIT', designation: 'Final Year Student', sourceAgency: 'NYC', caseStatus: 'Nominated', writeUp: 'Marcus runs a youth coding bootcamp for underprivileged secondary students. 80% of his graduates have gone on to tech-related studies.', reasonForNomination: 'CodeForward youth bootcamp (400 graduates, 80% pursuing tech); nominated by NYC for youth empowerment award.' },
    { fullName: 'Nur Atiqah', race: 'Malay', sex: 'F', email: 'atiqah@mendaki.org.sg', yearOfBirth: 2004, employerOrg: 'MENDAKI', designation: 'Youth Volunteer', sourceAgency: 'MCCY', caseStatus: 'Nominated', writeUp: 'Atiqah is a passionate community organizer who has galvanized 150 young volunteers for MENDAKI\'s weekend tutoring programme.', reasonForNomination: 'Mobilized 150 young volunteers; created digital learning resources used by 1,000 students.' },
    { fullName: 'Karthik Sundar', race: 'Indian', sex: 'M', email: 'karthik.s@nus.edu.sg', yearOfBirth: 2002, employerOrg: 'NUS', designation: 'Year 3 Student', sourceAgency: 'MOE', caseStatus: 'Nominated', writeUp: 'Karthik built an AI-powered tool matching youth volunteers with community needs. The tool is being evaluated by NVPC for national deployment.', reasonForNomination: 'AI volunteer-matching tool under evaluation by NVPC; IEEE paper on civic tech for youth.' },
    { fullName: 'Chloe Tan Wen Xin', race: 'Chinese', sex: 'F', email: 'chloe.tan@smu.edu.sg', yearOfBirth: 2003, employerOrg: 'SMU', designation: 'Year 2 Student', sourceAgency: 'NYC', caseStatus: 'Nominated', writeUp: 'Chloe leads SMU\'s Social Impact Club and organized a cross-university social enterprise pitch competition with $50K in prizes.', reasonForNomination: 'Social Enterprise Pitch Competition (200 participants, $50K prizes); connected 15 startups with mentors.' },

    // Inactive — formerly engaged, now disengaged
    { fullName: 'Tan Wei Jie', race: 'Chinese', sex: 'M', email: 'weijie.tan@shopee.com', yearOfBirth: 1996, employerOrg: 'Shopee', designation: 'Product Manager', sourceAgency: 'NYC', caseStatus: 'Inactive', writeUp: 'Wei Jie was an active NYC youth council member from 2020-2023. He mentored 30+ youth leaders but has since focused on career progression.', reasonForNomination: 'Mentored 30+ youth leaders through NYC Leadership Pipeline (2020-2023).' },
    { fullName: 'Arjun Singh', race: 'Indian', sex: 'M', email: 'arjun.singh@outlook.sg', yearOfBirth: 1997, employerOrg: 'Ministry of Defence', designation: 'Defence Engineer', sourceAgency: 'MINDEF', caseStatus: 'Inactive', writeUp: 'Arjun organized Total Defence Day youth engagement reaching 10,000 NSFs but has been posted overseas since mid-2025.', reasonForNomination: 'Total Defence Day youth engagement (10,000 NSFs); SG Armed Forces Youth Ambassador 2024.' },
    { fullName: 'Daniel Goh Cheng Huat', race: 'Chinese', sex: 'M', email: 'daniel.goh@temasek.com.sg', yearOfBirth: 1996, employerOrg: 'Temasek Foundation', designation: 'Senior Associate', sourceAgency: 'NYC', caseStatus: 'Inactive', writeUp: 'Daniel managed the Youth Giving Circle disbursing $500K in grants. He stepped back in 2025 to pursue an MBA overseas.', reasonForNomination: 'Managed Youth Giving Circle ($500K grants); transitioning to advisory role while overseas.' },
    { fullName: 'Serene Loh Pei Shan', race: 'Chinese', sex: 'F', email: 'serene.loh@gmail.com', yearOfBirth: 1997, employerOrg: 'Google Singapore', designation: 'UX Designer', sourceAgency: 'NYC', caseStatus: 'Inactive', writeUp: 'Serene designed the NYC youth engagement website and volunteered extensively until 2024. Career demands led to reduced involvement.', reasonForNomination: 'Designed NYC youth portal (UX); 500+ volunteer hours 2021-2024.' },
    { fullName: 'Faizal Bin Hassan', race: 'Malay', sex: 'M', email: 'faizal.h@tp.edu.sg', yearOfBirth: 2001, employerOrg: 'Temasek Polytechnic', designation: 'Graduate', sourceAgency: 'MCCY', caseStatus: 'Inactive', writeUp: 'Faizal was a youth sports ambassador but relocated to Johor Bahru after graduation. Still interested in cross-border youth sports exchanges.', reasonForNomination: 'Youth sports ambassador; interest in cross-border JB-SG youth sports collaboration.' },

    // Dormant — no contact in 6+ months
    { fullName: 'Grace Yeo Hui Ling', race: 'Chinese', sex: 'F', email: 'grace.yeo@yahoo.com', yearOfBirth: 1995, employerOrg: 'NTUC First Campus', designation: 'Curriculum Developer', sourceAgency: 'MSF', caseStatus: 'Dormant', writeUp: 'Grace was active in early childhood education advocacy for youth workers. Contact lost since early 2025.', reasonForNomination: 'Early childhood education advocacy for youth workforce development (2023-2024).' },
    { fullName: 'Ahmad Bin Yusof', race: 'Malay', sex: 'M', email: 'ahmad.yusof@hotmail.com', yearOfBirth: 1998, employerOrg: 'Self-employed', designation: 'Freelance Photographer', sourceAgency: 'MCCY', caseStatus: 'Dormant', writeUp: 'Ahmad documented youth events for MCCY but has not responded to outreach since July 2025. May have changed contact details.', reasonForNomination: 'Youth event photography; visual storytelling for MCCY campaigns (2023-2025).' },
    { fullName: 'Tanya De Souza', race: 'Eurasian', sex: 'F', email: 'tanya.ds@outlook.com', yearOfBirth: 1999, employerOrg: 'Mediacorp', designation: 'Content Producer', sourceAgency: 'NYC', caseStatus: 'Dormant', writeUp: 'Tanya produced youth-focused media content for NYC but has been unreachable since her role change at Mediacorp.', reasonForNomination: 'Produced "Youth Voices" media series for NYC (2024); potential for renewed media collaboration.' },

    // More Active profiles for volume
    { fullName: 'Lee Jun Hao', race: 'Chinese', sex: 'M', email: 'junhao.lee@ntu.edu.sg', yearOfBirth: 2002, employerOrg: 'NTU', designation: 'Year 3 Student', sourceAgency: 'MOE', caseStatus: 'Active', writeUp: 'Jun Hao leads NTU\'s student government engagement with national policy issues. He organized dialogues with 3 MPs on youth housing concerns.', reasonForNomination: 'Youth-MP dialogues on housing (3 sessions, 300 attendees); student government president.' },
    { fullName: 'Nadhirah Binte Sulaiman', race: 'Malay', sex: 'F', email: 'nadhirah.s@sim.edu.sg', yearOfBirth: 2001, employerOrg: 'SIM Global Education', designation: 'Year 3 Student', sourceAgency: 'MCCY', caseStatus: 'Active', writeUp: 'Nadhirah runs interfaith youth cooking workshops that bring together participants from all backgrounds. Her "Cook & Connect" series is now in its 3rd year.', reasonForNomination: 'Cook & Connect interfaith workshops (3 years, 1,200 participants); MCCY Social Cohesion Award nominee.' },
    { fullName: 'Jayden Ong Wei Ming', race: 'Chinese', sex: 'M', email: 'jayden.ong@gmail.com', yearOfBirth: 2000, employerOrg: 'Shopify', designation: 'Full Stack Developer', sourceAgency: 'NYC', caseStatus: 'Active', writeUp: 'Jayden builds open-source tools for non-profits. His "GiveTech" platform has onboarded 25 youth-serving NGOs and streamlined their operations.', reasonForNomination: 'GiveTech platform (25 NGOs onboarded); volunteer tech advisory for NYC digital initiatives.' },
    { fullName: 'Roshini Muthukumar', race: 'Indian', sex: 'F', email: 'roshini.m@sgh.com.sg', yearOfBirth: 1999, employerOrg: 'Singapore General Hospital', designation: 'Medical Officer', sourceAgency: 'MSF', caseStatus: 'Active', writeUp: 'Roshini combines her medical expertise with youth advocacy, running mental health first aid workshops for schools and youth organizations.', reasonForNomination: 'Mental Health First Aid workshops in 15 schools; advisor to MSF youth mental health taskforce.' },
    { fullName: 'Alvin Tay Zheng Kai', race: 'Chinese', sex: 'M', email: 'alvin.tay@ura.gov.sg', yearOfBirth: 1998, employerOrg: 'URA', designation: 'Urban Planner', sourceAgency: 'NYC', caseStatus: 'Active', writeUp: 'Alvin engages youth in urban planning conversations. His "Design Our City" workshops let young Singaporeans co-create neighbourhood improvement proposals.', reasonForNomination: 'Design Our City youth workshops (8 neighbourhoods); 5 proposals adopted by town councils.' },
    { fullName: 'Nabilah Binte Karim', race: 'Malay', sex: 'F', email: 'nabilah.k@imda.gov.sg', yearOfBirth: 2000, employerOrg: 'IMDA', designation: 'Digital Inclusion Officer', sourceAgency: 'MCCY', caseStatus: 'Active', writeUp: 'Nabilah leads digital inclusion programmes connecting elderly residents with youth digital ambassadors. 500+ seniors served.', reasonForNomination: 'Digital Ambassadors programme (200 youth, 500 seniors); IMDA Digital Inclusion Award 2025.' },
    { fullName: 'Benjamin Chua Keng Leong', race: 'Chinese', sex: 'M', email: 'ben.chua@nyp.edu.sg', yearOfBirth: 2003, employerOrg: 'Nanyang Polytechnic', designation: 'Final Year Student', sourceAgency: 'MOE', caseStatus: 'Active', writeUp: 'Benjamin created a peer tutoring network connecting poly students with secondary school students in heartland areas.', reasonForNomination: 'HeartlandTutor peer network (300 tutor-student pairs); reduced tuition cost barrier for 150 families.' },
    { fullName: 'Kavitha Rajendran', race: 'Indian', sex: 'F', email: 'kavitha.r@sp.edu.sg', yearOfBirth: 2002, employerOrg: 'Singapore Polytechnic', designation: 'Graduate', sourceAgency: 'MSF', caseStatus: 'Active', writeUp: 'Kavitha advocates for youth with disabilities, running inclusive workshops and advocating for better accessibility in youth programmes.', reasonForNomination: 'Inclusive Youth workshops (12 sessions); accessibility audit of 8 youth centres adopted by MSF.' },
    { fullName: 'Samuel Wong Jian Ming', race: 'Chinese', sex: 'M', email: 'samuel.wong@bytedance.com', yearOfBirth: 1999, employerOrg: 'ByteDance', designation: 'Content Strategist', sourceAgency: 'MCCY', caseStatus: 'Active', writeUp: 'Samuel advises MCCY on digital content strategy for reaching youth on social media platforms. His campaigns have reached 2M+ views.', reasonForNomination: 'MCCY social media youth campaigns (2M+ views); youth digital communications advisory.' },

    // More Nominated for pipeline
    { fullName: 'Hazirah Binte Ismail', race: 'Malay', sex: 'F', email: 'hazirah.i@tp.edu.sg', yearOfBirth: 2004, employerOrg: 'Temasek Polytechnic', designation: 'Year 2 Student', sourceAgency: 'MCCY', caseStatus: 'Nominated', writeUp: 'Hazirah organizes community service projects in Tampines, mobilizing poly students for weekend community clean-up and elderly visit programmes.', reasonForNomination: 'Tampines community service mobilization (100 volunteers weekly); emerging grassroots youth leader.' },
    { fullName: 'Ethan Lim Jia Xuan', race: 'Chinese', sex: 'M', email: 'ethan.lim@ite.edu.sg', yearOfBirth: 2005, employerOrg: 'ITE College East', designation: 'Year 2 Student', sourceAgency: 'MOE', caseStatus: 'Nominated', writeUp: 'Ethan champions skills-based education and runs an ITE student mentoring programme pairing graduates with current students for career guidance.', reasonForNomination: 'ITE peer mentoring programme (80 pairs); advocate for vocational education recognition.' },
    { fullName: 'Divya Sharma', race: 'Indian', sex: 'F', email: 'divya.sharma@duke-nus.edu.sg', yearOfBirth: 2001, employerOrg: 'Duke-NUS', designation: 'Medical Student', sourceAgency: 'MSF', caseStatus: 'Nominated', writeUp: 'Divya runs health literacy workshops for youth in lower-income neighbourhoods. She combines medical knowledge with community outreach.', reasonForNomination: 'Health literacy workshops in 5 neighbourhoods; youth health ambassador for HPB.' },
  ];

  const nrics = profileDefs.map((_, i) => {
    const prefix = i < 25 ? 'S9' : 'S8';
    const num = String(100000 + i).slice(1);
    const suffix = String.fromCharCode(65 + (i % 26));
    return `${prefix}${num}${suffix}`;
  });
  const hashes = nrics.map(hashNric);

  console.log('Seeding profiles...');
  await db.insert(schema.profiles).values(
    profileDefs.map((p, i) => ({
      caseId: `YS-2024-${String(i + 1).padStart(3, '0')}`,
      ...p,
      nricHash: hashes[i],
      nricEncrypted: encryptNric(nrics[i]),
      mobileNumber: `+659${String(10000000 + i).slice(1)}`,
      dataConsent: true,
      residentialStatus: i % 15 === 0 ? 'PR' : 'Citizen',
      linkedinHandle: i % 3 === 0 ? `linkedin.com/in/${p.fullName.toLowerCase().replace(/\s+/g, '-')}` : null,
      createdBy: admin.id,
      updatedBy: admin.id,
    }))
  );

  // ─── RELATIONSHIP MANAGERS ─────────────────────────────────
  console.log('Seeding relationship managers...');
  await db.insert(schema.relationshipManagers).values([
    { nricHash: hashes[0], name: 'Sarah Tan', email: sarah.email, agency: 'NYC', userId: sarah.id },
    { nricHash: hashes[1], name: 'Raj Kumar', email: raj.email, agency: 'MCCY', userId: raj.id },
    { nricHash: hashes[2], name: 'Chen Li Hua', email: chenli.email, agency: 'MOE', userId: chenli.id },
    { nricHash: hashes[3], name: 'Ahmad Ibrahim', email: ahmad.email, agency: 'MSF', userId: ahmad.id },
    { nricHash: hashes[4], name: 'Tan Wei Lin', email: tanwl.email, agency: 'MINDEF', userId: tanwl.id },
  ]);

  // ─── AREAS OF INTEREST ────────────────────────────────────
  console.log('Seeding areas of interest...');
  const interests = [
    { area: 'Mental Health & Wellness', alignment: 'Social Development' },
    { area: 'Digital Literacy & Innovation', alignment: 'Technology & Innovation' },
    { area: 'Sustainability & Climate Action', alignment: 'Green Economy' },
    { area: 'Arts, Heritage & Culture', alignment: 'Cultural Development' },
    { area: 'Social Entrepreneurship', alignment: 'Economic Development' },
    { area: 'Community Volunteering', alignment: 'Social Cohesion' },
    { area: 'Interfaith & Racial Harmony', alignment: 'Social Harmony' },
    { area: 'Sports & Active Living', alignment: 'Health & Wellness' },
    { area: 'Financial Literacy', alignment: 'Economic Development' },
    { area: 'Defence & National Service', alignment: 'National Security' },
    { area: 'Youth-at-Risk & Social Work', alignment: 'Social Development' },
    { area: 'Education & Lifelong Learning', alignment: 'Human Capital' },
    { area: 'Youth Philanthropy & Giving', alignment: 'Social Cohesion' },
    { area: 'Urban Planning & Housing', alignment: 'Infrastructure' },
    { area: 'Media & Communications', alignment: 'Cultural Development' },
    { area: 'Civic Participation & Policy', alignment: 'Governance' },
    { area: 'Disability Inclusion & Accessibility', alignment: 'Social Inclusion' },
    { area: 'Health & Medical Outreach', alignment: 'Health & Wellness' },
  ];
  const levels = ['High', 'Medium', 'Low'];

  // Assign interests based on profile themes
  const aoiData: { nricHash: string; areaOfInterest: string; alignment: string; levelOfInterest: string; levelOfInfluence: string; agency: string }[] = [];
  for (let i = 0; i < hashes.length; i++) {
    const count = 2 + randInt(0, 3);
    const shuffled = [...interests].sort(() => Math.random() - 0.5);
    const usedAgencies = new Set<string>();
    for (let j = 0; j < count; j++) {
      const agency = pick([...AGENCIES]);
      usedAgencies.add(agency);
      aoiData.push({
        nricHash: hashes[i],
        areaOfInterest: shuffled[j].area,
        alignment: shuffled[j].alignment,
        levelOfInterest: j === 0 ? 'High' : pick(levels),
        levelOfInfluence: pick(levels),
        agency,
      });
    }
  }
  await db.insert(schema.areasOfInterest).values(aoiData);

  // ─── AWARDS ───────────────────────────────────────────────
  console.log('Seeding awards...');
  const awardDefs = [
    { name: 'Singapore Youth Award', desc: 'Highest national honour for youth achievement across community leadership and volunteerism.' },
    { name: "President's Volunteerism & Philanthropy Award", desc: 'Recognising outstanding volunteerism and philanthropic contributions by youth leaders.' },
    { name: 'NYC Youth Award', desc: 'Annual NYC recognition for exceptional youth who demonstrate leadership and community impact.' },
    { name: 'MCCY Community Spirit Award', desc: 'For sustained contributions to community building and social cohesion among youth.' },
    { name: 'MOE Outstanding Youth in Education Award', desc: 'For excellence in educational innovation and student mentoring.' },
    { name: 'National Day Award (Commendation Medal)', desc: 'National Day recognition for meritorious service in youth development.' },
    { name: 'ASEAN Youth Leader Award', desc: 'Regional recognition for leadership impact across ASEAN youth networks.' },
    { name: 'Young ChangeMakers Grant', desc: 'Funding grant for innovative youth-led community projects.' },
    { name: 'MAS Financial Literacy Champion', desc: 'Recognition for outstanding contributions to youth financial education.' },
    { name: 'Sport SG Youth Ambassador Award', desc: 'For promoting active living and youth sports participation nationally.' },
    { name: 'IMDA Digital Inclusion Award', desc: 'For bridging the digital divide through youth-led programmes.' },
    { name: 'MSF Social Innovation Award', desc: 'For innovative approaches to social services and youth-at-risk support.' },
    { name: 'PA Grassroots Youth Award', desc: 'For outstanding contributions to grassroots community building.' },
    { name: "President's Design Award (Student)", desc: 'National recognition for design excellence addressing community challenges.' },
  ];

  const awardData: { nricHash: string; year: number; awardName: string; description: string }[] = [];
  // Champions get 2-3 awards each
  for (let i = 0; i < 4; i++) {
    const count = randInt(2, 3);
    const shuffled = [...awardDefs].sort(() => Math.random() - 0.5);
    for (let j = 0; j < count; j++) {
      awardData.push({ nricHash: hashes[i], year: randInt(2023, 2026), awardName: shuffled[j].name, description: shuffled[j].desc });
    }
  }
  // Advocates get 1-2
  for (let i = 4; i < 9; i++) {
    const count = randInt(1, 2);
    const shuffled = [...awardDefs].sort(() => Math.random() - 0.5);
    for (let j = 0; j < count; j++) {
      awardData.push({ nricHash: hashes[i], year: randInt(2024, 2026), awardName: shuffled[j].name, description: shuffled[j].desc });
    }
  }
  // Some active profiles get 1 award
  for (let i = 9; i < 17; i += 2) {
    const a = pick(awardDefs);
    awardData.push({ nricHash: hashes[i], year: randInt(2024, 2026), awardName: a.name, description: a.desc });
  }
  await db.insert(schema.awards).values(awardData);

  // ─── COMMUNITY ────────────────────────────────────────────
  console.log('Seeding community...');
  const orgGroups = [
    'Youth Corps Singapore', "People's Association Youth Network", 'NYC Youth Council',
    'MCCY Youth Advisory Panel', 'National Youth Council', 'ASEAN Youth Fellowship',
    'SG Youth Action Plan Committee', 'Youth Mental Health Alliance',
    'Green Plan Youth Taskforce', 'Youthful Aging Network', 'MENDAKI Young Professional Network',
    'SINDA Youth Wing', 'CDAC Youth Chapter', 'OnePA Youth Executive Committee',
    'Singapore Red Cross Youth', 'St John Brigade Youth', 'SG Cares Volunteer Centre Youth Wing',
  ];
  const communityRoles = ['Member', 'Vice-Chairperson', 'Chairperson', 'Secretary', 'Committee Member', 'Volunteer Lead', 'Treasurer', 'Programme Director'];
  const communityData: { nricHash: string; startDate: string; endDate: string | null; orgGroupName: string; role: string; description: string }[] = [];

  for (let i = 0; i < hashes.length; i++) {
    const count = i < 9 ? randInt(2, 4) : randInt(1, 2);
    for (let j = 0; j < count; j++) {
      const startYear = randInt(2021, 2025);
      const startMonth = randInt(1, 12);
      const ended = i >= 25 && i < 35 ? true : Math.random() > 0.6;
      communityData.push({
        nricHash: hashes[i],
        startDate: date(startYear, startMonth, randInt(1, 28)),
        endDate: ended ? date(startYear + randInt(1, 2), randInt(1, 12), randInt(1, 28)) : null,
        orgGroupName: pick(orgGroups),
        role: j === 0 && i < 9 ? pick(['Chairperson', 'Vice-Chairperson', 'Programme Director']) : pick(communityRoles),
        description: [
          'Active participant in strategic planning and programme development.',
          'Led working committee on youth engagement and outreach.',
          'Contributed to policy advisory on youth development issues.',
          'Coordinated volunteer mobilization and training.',
          'Managed community partnerships and stakeholder relations.',
          'Organized flagship annual events and workshops.',
        ][j % 6],
      });
    }
  }
  await db.insert(schema.community).values(communityData);

  // ─── EVENTS ───────────────────────────────────────────────
  console.log('Seeding events...');
  const eventDefs = [
    { title: 'National Youth Dialogue 2025', type: 'Dialogue', aoi: 'Civic Participation & Policy' },
    { title: 'SG Youth Climate Action Summit 2025', type: 'Summit', aoi: 'Sustainability & Climate Action' },
    { title: 'Youth Mental Wellness Forum', type: 'Forum', aoi: 'Mental Health & Wellness' },
    { title: 'Digital Skills for Youth Workshop', type: 'Workshop', aoi: 'Digital Literacy & Innovation' },
    { title: 'Cross-Cultural Youth Exchange', type: 'Exchange', aoi: 'Interfaith & Racial Harmony' },
    { title: 'Youth Social Enterprise Bootcamp', type: 'Camp', aoi: 'Social Entrepreneurship' },
    { title: 'Future Economy Youth Symposium', type: 'Symposium', aoi: 'Financial Literacy' },
    { title: 'National Day Youth Celebration 2025', type: 'Celebration', aoi: 'Community Volunteering' },
    { title: 'ASEAN Youth Leaders Summit 2025', type: 'Summit', aoi: 'Civic Participation & Policy' },
    { title: 'SG Cares Youth Volunteerism Day', type: 'Campaign', aoi: 'Community Volunteering' },
    { title: 'Youth Policy Hackathon 2026', type: 'Hackathon', aoi: 'Civic Participation & Policy' },
    { title: 'Inter-Agency Youth Forum Q1 2026', type: 'Forum', aoi: 'Civic Participation & Policy' },
    { title: 'SG Youth Arts Festival 2025', type: 'Festival', aoi: 'Arts, Heritage & Culture' },
    { title: 'Youth Sports Challenge 2025', type: 'Competition', aoi: 'Sports & Active Living' },
    { title: 'Financial Literacy Youth Camp', type: 'Camp', aoi: 'Financial Literacy' },
    { title: 'Young ChangeMakers Showcase 2026', type: 'Exhibition', aoi: 'Social Entrepreneurship' },
    { title: 'Design Our City Youth Workshop', type: 'Workshop', aoi: 'Urban Planning & Housing' },
    { title: 'Youth Mental Health First Aid Training', type: 'Training', aoi: 'Mental Health & Wellness' },
    { title: 'Green Plan Youth Forum 2026', type: 'Forum', aoi: 'Sustainability & Climate Action' },
    { title: 'Youth in Governance Dialogue', type: 'Dialogue', aoi: 'Civic Participation & Policy' },
    { title: 'Cook & Connect Interfaith Workshop', type: 'Workshop', aoi: 'Interfaith & Racial Harmony' },
    { title: 'HeartlandTutor Community Launch', type: 'Launch', aoi: 'Education & Lifelong Learning' },
    { title: 'Inclusive Youth Workshop Series', type: 'Workshop', aoi: 'Disability Inclusion & Accessibility' },
    { title: 'DesignSprint SG 2026', type: 'Hackathon', aoi: 'Digital Literacy & Innovation' },
    { title: 'Youth Philanthropy Giving Circle', type: 'Workshop', aoi: 'Youth Philanthropy & Giving' },
  ];
  const youthRoles = ['Participant', 'Facilitator', 'Speaker', 'Organizer', 'Panelist', 'Volunteer', 'Moderator', 'Mentor'];
  const briefNotes = [
    'Demonstrated exceptional leadership and active participation throughout the event.',
    'Provided insightful contributions during group discussions and breakout sessions.',
    'Networked effectively with peers and agency representatives; follow-up planned.',
    'Showed strong facilitation skills; recommended for future leadership roles.',
    'Active participant who asked thought-provoking questions during panel sessions.',
    'Helped coordinate logistics; reliable and organized team player.',
    'Presented innovative ideas that received positive feedback from attendees.',
    'Contributed cross-agency perspective that enriched the discussion.',
  ];

  const eventsData: { nricHash: string; eventTitle: string; startDate: string; endDate: string; organizerAgency: string; eventType: string; aoiForEvent: string; roleOfYouth: string; attendance: string; briefNotes: string; partners: string }[] = [];

  for (let i = 0; i < hashes.length; i++) {
    let eventCount: number;
    if (i < 4) eventCount = randInt(8, 12);         // Champions: heavy
    else if (i < 9) eventCount = randInt(5, 8);      // Advocates: strong
    else if (i < 26) eventCount = randInt(2, 5);     // Active/Nominated
    else if (i < 35) eventCount = randInt(1, 2);     // Inactive: few, older
    else eventCount = randInt(0, 1);                  // Dormant: minimal

    for (let j = 0; j < eventCount; j++) {
      const ev = pick(eventDefs);
      let yr: number, mo: number;
      if (i < 9) {
        // Champions/Advocates: spread from 2024 to May 2026, recent heavy
        yr = j < 3 ? 2026 : j < 6 ? 2025 : 2024;
        mo = yr === 2026 ? randInt(1, 5) : randInt(1, 12);
      } else if (i < 26) {
        // Active/Nominated: 2025-2026
        yr = j === 0 ? 2026 : randInt(2025, 2026);
        mo = yr === 2026 ? randInt(1, 5) : randInt(1, 12);
      } else {
        // Inactive/Dormant: older dates
        yr = randInt(2023, 2024);
        mo = randInt(1, 12);
      }
      const dy = randInt(1, 28);
      const endDy = Math.min(28, dy + randInt(0, 2));

      eventsData.push({
        nricHash: hashes[i],
        eventTitle: ev.title,
        startDate: date(yr, mo, dy),
        endDate: date(yr, mo, endDy),
        organizerAgency: pick([...AGENCIES]),
        eventType: ev.type,
        aoiForEvent: ev.aoi,
        roleOfYouth: i < 9 ? pick(['Speaker', 'Organizer', 'Panelist', 'Facilitator', 'Moderator']) : pick(youthRoles),
        attendance: Math.random() > 0.05 ? 'Attended' : 'No Show',
        briefNotes: pick(briefNotes),
        partners: pick(['NYC, MCCY', 'MOE, PA', 'MSF, NVPC', 'MCCY, MENDAKI', 'NYC, Sport SG', 'MOE, IMDA', '']),
      });
    }
  }
  await db.insert(schema.events).values(eventsData);

  // ─── INTERACTIONS ─────────────────────────────────────────
  console.log('Seeding interactions...');
  const interactionTemplates = [
    'Quarterly review of ongoing projects and strategic alignment with agency priorities.',
    'Follow-up on youth programme participation and gathered stakeholder feedback.',
    'Initial engagement meeting to onboard stakeholder into inter-agency youth initiatives.',
    'Policy feedback session on youth panel recommendations for upcoming Green Plan review.',
    'Briefing on upcoming ASEAN youth representation opportunity and nomination process.',
    'Performance review of youth-led community project outcomes and KPIs.',
    'Strategy session on scaling programme to additional neighbourhoods.',
    'Debrief after National Day Youth Celebration; discussed next steps.',
    'Cross-agency coordination meeting on shared stakeholder engagement.',
    'Career mentoring conversation; discussed transition from student to working professional.',
    'Introduced to new agency contact for expanded collaboration opportunities.',
    'Reviewed grant application progress and timeline for Young ChangeMakers funding.',
    'One-on-one check-in on personal well-being and workload sustainability.',
    'Planning session for upcoming Youth Policy Hackathon logistics and judging panel.',
    'Stakeholder expressed interest in expanding programme to JB-SG cross-border scope.',
  ];
  const interactionNotes = [
    'Stakeholder highly engaged and proactive. Strong follow-through on action items.',
    'Good conversation; stakeholder raised concerns about programme sustainability funding.',
    'Stakeholder responsive but flagged time constraints due to academic commitments.',
    'Excellent meeting; stakeholder proposed new initiative for cross-agency consideration.',
    'Follow-up needed: stakeholder requested data on programme outcomes for board presentation.',
    'Warm engagement; stakeholder keen to mentor younger nominees in the pipeline.',
    'Noted declining responsiveness; may need re-engagement strategy.',
    'Very productive session; concrete action items agreed with clear deadlines.',
    'Stakeholder enthusiastic about new direction; volunteered for pilot programme.',
    'Relationship deepening; stakeholder now comfortable sharing candid feedback on policy.',
  ];

  const interactionData: { nricHash: string; interactionDetails: string; meetingDate: string; agency: string; pocStaffName: string; pocStaffEmail: string; briefNotes: string; createdBy: string }[] = [];

  for (let i = 0; i < hashes.length; i++) {
    let intCount: number;
    if (i < 4) intCount = randInt(6, 10);        // Champions: frequent
    else if (i < 9) intCount = randInt(4, 7);     // Advocates: regular
    else if (i < 26) intCount = randInt(2, 4);    // Active/Nominated
    else if (i < 35) intCount = randInt(1, 2);    // Inactive
    else intCount = randInt(0, 1);                // Dormant

    for (let j = 0; j < intCount; j++) {
      const rm = pick(rmUsers);
      let yr: number, mo: number;
      if (i < 9) {
        yr = j < 2 ? 2026 : j < 5 ? 2025 : 2024;
        mo = yr === 2026 ? randInt(3, 5) : randInt(1, 12);
      } else if (i < 26) {
        yr = j === 0 ? 2026 : randInt(2025, 2026);
        mo = yr === 2026 ? randInt(1, 5) : randInt(1, 12);
      } else {
        yr = randInt(2023, 2025);
        mo = yr === 2025 ? randInt(1, 3) : randInt(1, 12);
      }

      interactionData.push({
        nricHash: hashes[i],
        interactionDetails: pick(interactionTemplates),
        meetingDate: date(yr, mo, randInt(1, 28)),
        agency: rm.agency,
        pocStaffName: rm.fullName,
        pocStaffEmail: rm.email,
        briefNotes: pick(interactionNotes),
        createdBy: rm.id,
      });
    }
  }
  await db.insert(schema.interactions).values(interactionData);

  // ─── OVERSEAS REPRESENTATION ──────────────────────────────
  console.log('Seeding overseas representation...');
  const overseasDefs = [
    { desc: 'Represented Singapore at the ASEAN Youth Forum in Jakarta, Indonesia. Led panel on digital inclusion.', year: 2025 },
    { desc: 'Attended the World Youth Summit in Geneva, Switzerland as SG delegate. Presented on climate action.', year: 2025 },
    { desc: 'Participated in the Commonwealth Youth Council meeting in London, UK. Advocated for youth mental health.', year: 2024 },
    { desc: 'Spoke at the UN Youth Climate Action Panel in New York, USA. Represented SG Youth Climate Coalition.', year: 2025 },
    { desc: 'Joined the Asia-Pacific Youth Exchange programme in Seoul, South Korea. Cultural exchange and policy dialogue.', year: 2024 },
    { desc: 'Represented NYC at the Global Youth Leadership Conference in Tokyo, Japan. Workshop facilitator.', year: 2025 },
    { desc: 'Delegate at G20 Youth Summit in Johannesburg, South Africa. Presented on youth social entrepreneurship.', year: 2025 },
    { desc: 'Speaker at APEC Youth Forum in Lima, Peru. Shared SG experience on youth-government partnership models.', year: 2024 },
    { desc: 'Attended World Economic Forum Global Shapers event in Davos. Networking with youth leaders from 50 countries.', year: 2026 },
    { desc: 'Led SG youth delegation to UNESCO Youth Forum in Paris, France. Co-authored outcome statement on AI literacy.', year: 2025 },
    { desc: 'Participated in Temasek Foundation International youth exchange in Phnom Penh, Cambodia.', year: 2024 },
    { desc: 'Represented SG at Youth Co:Lab Asia-Pacific Summit in Bangkok, Thailand. Social enterprise pitch finalist.', year: 2025 },
  ];

  const overseasData: { nricHash: string; year: number; description: string }[] = [];
  // Champions: 2-3 overseas each
  for (let i = 0; i < 4; i++) {
    const count = randInt(2, 3);
    const shuffled = [...overseasDefs].sort(() => Math.random() - 0.5);
    for (let j = 0; j < count; j++) {
      overseasData.push({ nricHash: hashes[i], year: shuffled[j].year, description: shuffled[j].desc });
    }
  }
  // Advocates: 1-2
  for (let i = 4; i < 9; i++) {
    const count = randInt(1, 2);
    const shuffled = [...overseasDefs].sort(() => Math.random() - 0.5);
    for (let j = 0; j < count; j++) {
      overseasData.push({ nricHash: hashes[i], year: shuffled[j].year, description: shuffled[j].desc });
    }
  }
  // A few active
  for (let i = 9; i < 17; i += 3) {
    const o = pick(overseasDefs);
    overseasData.push({ nricHash: hashes[i], year: o.year, description: o.desc });
  }
  await db.insert(schema.overseasRepresentation).values(overseasData);

  // ─── ENGAGEMENT SCORES ────────────────────────────────────
  console.log('Seeding engagement scores...');
  await db.insert(schema.engagementScores).values(
    hashes.map((h, i) => {
      let total: number, rec: number, freq: number, depth: number, breadth: number;
      if (i < 4) {
        total = randInt(80, 95); rec = randInt(70, 95); freq = randInt(75, 100); depth = randInt(80, 100); breadth = randInt(75, 100);
      } else if (i < 9) {
        total = randInt(60, 79); rec = randInt(55, 80); freq = randInt(50, 85); depth = randInt(55, 85); breadth = randInt(60, 90);
      } else if (i < 17) {
        total = randInt(40, 65); rec = randInt(35, 70); freq = randInt(30, 70); depth = randInt(25, 60); breadth = randInt(35, 70);
      } else if (i < 26) {
        total = randInt(20, 45); rec = randInt(15, 40); freq = randInt(10, 35); depth = randInt(10, 30); breadth = randInt(15, 40);
      } else if (i < 35) {
        total = randInt(10, 25); rec = randInt(5, 15); freq = randInt(5, 15); depth = randInt(10, 30); breadth = randInt(5, 20);
      } else {
        total = randInt(3, 12); rec = randInt(0, 5); freq = randInt(0, 5); depth = randInt(5, 15); breadth = randInt(0, 10);
      }
      const churn = i < 4 ? randInt(3, 12) : i < 9 ? randInt(10, 25) : i < 17 ? randInt(20, 45) : i < 26 ? randInt(35, 55) : i < 35 ? randInt(60, 85) : randInt(80, 98);
      const segment = total >= 75 ? 'Champion' : total >= 55 ? 'Rising Star' : total >= 35 ? 'Active' : total >= 20 ? 'At-Risk' : 'Dormant';

      return {
        nricHash: h,
        totalScore: String(total),
        recencyScore: String(rec),
        frequencyScore: String(freq),
        depthScore: String(depth),
        breadthScore: String(breadth),
        segment,
        churnRisk: String(churn),
      };
    })
  );

  // ─── AI CONVERSATIONS ─────────────────────────────────────
  console.log('Seeding AI conversations...');
  await db.insert(schema.aiConversations).values([
    {
      userId: sarah.id,
      title: 'Youth engagement trends Q1 2026',
      llmProvider: 'anthropic',
      messages: JSON.stringify([
        { role: 'user', content: 'What are the top engagement trends among our youth stakeholders this quarter?' },
        { role: 'assistant', content: 'Based on Q1 2026 data across 50 stakeholders:\n\n1. **Sustainability & Climate Action** continues to be the fastest-growing area of interest, with 12 stakeholders now actively involved (up from 8 in Q4 2025).\n2. **Mental Health & Wellness** engagement has deepened — 3 stakeholders have taken on facilitator roles in agency-organized workshops.\n3. **Digital Literacy** programmes show strong cross-agency appeal, with participants spanning MCCY, MOE, and NYC.\n4. **Social Entrepreneurship** interest is emerging among Nominated-tier stakeholders, suggesting a pipeline of future advocates.\n\nChurn risk has decreased 15% overall, driven by the new quarterly touchpoint cadence.' },
      ]),
    },
    {
      userId: raj.id,
      title: 'Stakeholder churn risk analysis',
      llmProvider: 'anthropic',
      messages: JSON.stringify([
        { role: 'user', content: 'Which stakeholders are at highest risk of disengagement and what should we do?' },
        { role: 'assistant', content: 'I\'ve identified 8 stakeholders with churn risk above 60%:\n\n**Critical (>80% risk):**\n- Grace Yeo Hui Ling — no contact since early 2025; formerly active in early childhood education advocacy\n- Ahmad Bin Yusof — unreachable since July 2025; may have changed contact details\n- Tanya De Souza — role change at Mediacorp; needs re-engagement through new channel\n\n**Elevated (60-80% risk):**\n- Tan Wei Jie, Arjun Singh, Daniel Goh, Serene Loh, Faizal Bin Hassan — all transitioned to career focus or relocated\n\n**Recommended actions:**\n1. Prioritize personal outreach to Grace, Ahmad, Tanya via alternate channels (LinkedIn, mutual contacts)\n2. For career-focused inactives, offer advisory/mentoring roles that require less time commitment\n3. For Faizal (relocated to JB), explore cross-border programme as re-engagement hook\n4. Set 30-day re-engagement deadline; if unsuccessful, transition to alumni network status' },
      ]),
    },
    {
      userId: chenli.id,
      title: 'Cross-agency overlap insights',
      llmProvider: 'openai',
      messages: JSON.stringify([
        { role: 'user', content: 'Can you analyze which stakeholders are known to multiple agencies and which are single-agency?' },
        { role: 'assistant', content: 'Here\'s the cross-agency analysis:\n\n**Multi-Agency Champions (4+ agencies):**\n- Aisha Binte Rahman — NYC, MCCY, MOE, MSF (mental health advocacy spans all)\n- Kevin Teo — MCCY, NYC, MOE (built tools used across agencies)\n- Rachel Ng — NYC, MCCY (social enterprise connects both)\n- Jessica Wong — MCCY, NYC, MSF (volunteerism framework adopted widely)\n\n**Dual-Agency (2-3 agencies):**\n- 15 stakeholders interact with 2-3 agencies, primarily through events and shared AOIs\n\n**Single-Agency Only:**\n- 12 stakeholders (mostly Nominated tier) only have touchpoints with their source agency\n- This represents an opportunity for cross-pollination through inter-agency events\n\n**Recommendation:** Target single-agency stakeholders for the next Inter-Agency Youth Forum to broaden their network and increase retention.' },
      ]),
    },
    {
      userId: sarah.id,
      title: 'Briefing prep for Aisha Binte Rahman',
      llmProvider: 'anthropic',
      messages: JSON.stringify([
        { role: 'user', content: 'I have a meeting with Aisha Binte Rahman next week. Can you prepare a briefing?' },
        { role: 'assistant', content: '**Stakeholder Briefing: Aisha Binte Rahman**\n\n**Status:** Champion | **Engagement Score:** 92/100 | **Churn Risk:** Low (5%)\n\n**Background:**\n- DBS Bank Associate, born 1999\n- Source agency: NYC, but engaged across NYC, MCCY, MOE, MSF\n- Key focus: Mental health & wellness, community volunteering\n\n**Recent Activity (Last 90 days):**\n- Spoke at Inter-Agency Youth Forum Q1 2026 (MCCY, March)\n- Facilitated Youth Mental Health First Aid Training (MSF, April)\n- Attended Green Plan Youth Forum 2026 (MOE, February)\n\n**Awards:** Singapore Youth Award (2025), NYC Youth Award (2024)\n\n**Overseas:** ASEAN Youth Forum Jakarta (2025), UN Youth Climate Panel NYC (2025)\n\n**Talking Points:**\n1. Her mental health programme expansion — ask about scaling plans\n2. Cross-agency coordination feedback — she has unique multi-agency perspective\n3. ASEAN Youth Forum debrief and any follow-up commitments\n4. Interest in advisory role on upcoming youth policy review\n\n**Watch out:** She mentioned workload concerns in last interaction. Check in on sustainability.' },
      ]),
    },
    {
      userId: ahmad.id,
      title: 'Youth-at-risk programme effectiveness',
      llmProvider: 'anthropic',
      messages: JSON.stringify([
        { role: 'user', content: 'How effective are our youth-at-risk programmes based on stakeholder engagement data?' },
        { role: 'assistant', content: 'Based on engagement data for stakeholders involved in youth-at-risk support:\n\n**Programme Champions:**\n- Cheryl Ong (MSF) — peer mentoring network supporting 200+ at-risk youths; engagement score 58\n- Kavitha Rajendran (MSF) — inclusive youth workshops; accessibility audit adopted by 8 centres\n\n**Key Metrics:**\n- 4 stakeholders actively engaged in youth-at-risk AOI\n- Average event attendance: 95% (higher than portfolio average of 88%)\n- Cross-agency involvement: most youth-at-risk work is MSF-concentrated (opportunity to expand)\n\n**Gaps Identified:**\n1. No Champion-tier stakeholder focused primarily on youth-at-risk — potential leadership vacuum\n2. Only 2 stakeholders in this space with MOE touchpoints (school-based interventions underrepresented)\n3. Limited connection to digital inclusion programmes (youth-at-risk often face digital divide)\n\n**Recommendation:** Nominate Cheryl Ong for Advocate track; introduce her to IMDA\'s Nabilah for digital inclusion crossover.' },
      ]),
    },
  ]);

  // ─── UPLOAD HISTORY ───────────────────────────────────────
  console.log('Seeding upload history...');
  await db.insert(schema.uploadHistory).values([
    { userId: admin.id, fileName: 'stakeholder_master_2024.xlsx', tableTarget: 'profiles', fileSizeBytes: 245760, rowCount: 50, rowsInserted: 50, rowsUpdated: 0, rowsFailed: 0, status: 'completed', startedAt: new Date('2024-08-15T09:00:00Z'), completedAt: new Date('2024-08-15T09:00:12Z') },
    { userId: admin.id, fileName: 'interactions_q3_q4_2024.xlsx', tableTarget: 'interactions', fileSizeBytes: 184320, rowCount: 85, rowsInserted: 85, rowsUpdated: 0, rowsFailed: 0, status: 'completed', startedAt: new Date('2025-01-10T10:30:00Z'), completedAt: new Date('2025-01-10T10:30:08Z') },
    { userId: sarah.id, fileName: 'nyc_events_2025.xlsx', tableTarget: 'events', fileSizeBytes: 312400, rowCount: 120, rowsInserted: 95, rowsUpdated: 25, rowsFailed: 0, status: 'completed', startedAt: new Date('2025-06-01T14:00:00Z'), completedAt: new Date('2025-06-01T14:00:15Z') },
    { userId: raj.id, fileName: 'mccy_aoi_update.csv', tableTarget: 'areas_of_interest', fileSizeBytes: 52480, rowCount: 75, rowsInserted: 30, rowsUpdated: 45, rowsFailed: 0, status: 'completed', startedAt: new Date('2025-09-15T11:00:00Z'), completedAt: new Date('2025-09-15T11:00:05Z') },
    { userId: admin.id, fileName: 'awards_2025_compilation.xlsx', tableTarget: 'awards', fileSizeBytes: 28672, rowCount: 25, rowsInserted: 25, rowsUpdated: 0, rowsFailed: 0, status: 'completed', startedAt: new Date('2025-12-20T16:00:00Z'), completedAt: new Date('2025-12-20T16:00:03Z') },
    { userId: chenli.id, fileName: 'moe_stakeholder_update_2026.xlsx', tableTarget: 'profiles', fileSizeBytes: 156000, rowCount: 15, rowsInserted: 5, rowsUpdated: 10, rowsFailed: 0, status: 'completed', startedAt: new Date('2026-02-10T09:30:00Z'), completedAt: new Date('2026-02-10T09:30:06Z') },
    { userId: ahmad.id, fileName: 'msf_interactions_q1_2026.csv', tableTarget: 'interactions', fileSizeBytes: 98304, rowCount: 42, rowsInserted: 42, rowsUpdated: 0, rowsFailed: 0, status: 'completed', startedAt: new Date('2026-04-05T10:00:00Z'), completedAt: new Date('2026-04-05T10:00:07Z') },
    { userId: sarah.id, fileName: 'events_may_2026_partial.xlsx', tableTarget: 'events', fileSizeBytes: 45000, rowCount: 18, rowsInserted: 15, rowsUpdated: 0, rowsFailed: 3, status: 'completed', startedAt: new Date('2026-05-18T15:30:00Z'), completedAt: new Date('2026-05-18T15:30:04Z') },
  ]);

  // ─── SUMMARY ──────────────────────────────────────────────
  console.log(`\nSeed complete!`);
  console.log(`  Users: ${users.length}`);
  console.log(`  Relationship Managers: 5`);
  console.log(`  Profiles: ${profileDefs.length}`);
  console.log(`  Areas of Interest: ${aoiData.length}`);
  console.log(`  Awards: ${awardData.length}`);
  console.log(`  Community: ${communityData.length}`);
  console.log(`  Events: ${eventsData.length}`);
  console.log(`  Interactions: ${interactionData.length}`);
  console.log(`  Overseas Representation: ${overseasData.length}`);
  console.log(`  Engagement Scores: ${hashes.length}`);
  console.log(`  AI Conversations: 5`);
  console.log(`  Upload History: 8`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
