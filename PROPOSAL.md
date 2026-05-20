# Youth360: Multi-Agency Smart Stakeholder 360 Web Portal
## Proposal for Singapore Agency Relationship Managers

---

## Data Model Summary

```
Profiles (NRIC = primary key)
  |
  |-- linked via Full NRIC -->  Interactions (meeting logs)
  |-- linked via Full NRIC -->  Events (participation & roles)
  |-- linked via Full NRIC -->  Awards (recognition history)
  |-- linked via Full NRIC -->  Community (org involvement)
  |-- linked via Full NRIC -->  Overseas Representation
  |-- linked via Full NRIC -->  Areas of Interest (with Agency alignment)
  |
  |-- assigned to ----------->  Relationship Managers (via RM Details + Agency)
```

**Key cross-agency linkage:** A single stakeholder (by NRIC) can appear across multiple agencies' records in Interactions, Events, Areas of Interest, and RM assignments -- enabling a whole-of-government view.

---

## Solution 1: Unified Stakeholder Dashboard (Simplest)
**Build time: ~4-6 weeks | Core theme: "See the full picture"**

### What It Does
A single searchable web portal that consolidates all 8 tables into one unified stakeholder profile view, replacing siloed spreadsheets/systems per agency.

### IDENTIFY - Cross-Agency Stakeholder Directory
| Feature | How It Works | Tables Used |
|---|---|---|
| **Unified Profile Card** | Search by name/NRIC to see one consolidated profile across all agencies | `Profiles` |
| **Cross-Agency Flag** | Badge showing "Known to 3 agencies" when multiple agencies have records for the same NRIC | `Interactions`, `Events`, `Areas of Interest` (Agency field) |
| **RM Contact Directory** | See which RM from which agency manages this stakeholder; click to email | `Relationship Managers` + `Profiles.RM Details` |
| **Duplicate Detection** | Flag potential duplicate profiles using NRIC + name fuzzy matching | `Profiles` |

### ENGAGE - 360 Timeline View
| Feature | How It Works | Tables Used |
|---|---|---|
| **Activity Timeline** | Chronological feed of all interactions, events, awards, community roles for a stakeholder | `Interactions`, `Events`, `Awards`, `Community`, `Overseas Representation` |
| **Interaction Log** | View all past meetings, notes, attachments in one place | `Interactions` (Meeting Date, Brief notes, Attachments) |
| **Quick Filters** | Filter timeline by: agency, date range, activity type (event/meeting/award) | All tables (Created At, Agency fields) |

### GROW & ACTIVATE - Basic RM Workspace
| Feature | How It Works | Tables Used |
|---|---|---|
| **My Stakeholders List** | RM logs in and sees all stakeholders assigned to them | `Relationship Managers` + `Profiles` |
| **Last Contact Indicator** | Shows days since last interaction per stakeholder (red/amber/green) | `Interactions` (Meeting Date) |
| **Export to CSV** | Export filtered stakeholder lists for reporting | All tables |

### Architecture
```
[ React/Next.js Frontend ]
        |
[ REST API (Node.js/Express) ]
        |
[ PostgreSQL Database ]
  (8 tables migrated from current source)
```

---

## Solution 2: Smart Engagement Analytics & Collaboration Hub (Medium)
**Build time: ~10-14 weeks | Core theme: "Understand and collaborate"**

*Includes everything in Solution 1, plus:*

### IDENTIFY - Network Intelligence
| Feature | How It Works | Tables Used |
|---|---|---|
| **Stakeholder Network Graph** | Visual network map showing connections between stakeholders via shared events, organisations, and areas of interest | `Events` (co-attendance), `Community` (same org), `Areas of Interest` |
| **Agency Overlap Matrix** | Dashboard showing which agencies share the most stakeholders; click to see the shared cohort | `Interactions`, `Events`, `Areas of Interest` (Agency field) |
| **Interest-Based Discovery** | "Find stakeholders interested in Climate Action across all agencies" -- search by AOI across the entire government network | `Areas of Interest`, `Profiles` |
| **Influence Mapping** | Scatter plot of stakeholders by Level of Interest vs. Level of Influence per Area of Interest | `Areas of Interest` (Level of Interest, Level of Influence) |

### ENGAGE - Engagement Scoring & Insights
| Feature | How It Works | Tables Used |
|---|---|---|
| **Engagement Score** | Composite score (0-100) per stakeholder based on: recency of interaction, frequency of events, awards received, community roles held, overseas representation | `Interactions`, `Events`, `Awards`, `Community`, `Overseas Representation` |
| **Engagement Trend Chart** | Line chart showing engagement score over time -- is this stakeholder becoming more or less active? | All activity tables (date fields) |
| **Sentiment Tagging** | RMs tag interactions as Positive / Neutral / Needs Follow-up; aggregated into stakeholder health indicator | `Interactions` (enhanced with new field) |
| **Event Impact Analysis** | For each event: attendance count, % of high-influence stakeholders, cross-agency participation rate | `Events` (Attendance, Areas of Interest, Programme Organizer) |

### GROW & ACTIVATE - Collaborative RM Workflows
| Feature | How It Works | Tables Used |
|---|---|---|
| **Cross-Agency RM Chat** | When 2+ agencies share a stakeholder, their RMs get a shared thread to coordinate (avoid duplicate outreach) | `Relationship Managers`, `Profiles` |
| **Warm Introduction Requests** | RM from Agency A can request an intro to a stakeholder managed by Agency B's RM | `Relationship Managers` |
| **Engagement Reminders** | Auto-reminders when stakeholder hasn't been contacted in 60/90/120 days | `Interactions` (Meeting Date) |
| **Stakeholder Journey Map** | Visual pipeline: Nominated -> First Contact -> Active Engagement -> Champion -> Advocate | `Profiles` (Case Status), `Interactions`, `Events` |
| **Bulk Event Invitation** | Select stakeholders by AOI/influence and generate event invitation lists | `Areas of Interest`, `Profiles`, `Events` |

### Architecture
```
[ React/Next.js Frontend + D3.js Visualizations ]
        |
[ GraphQL API (Node.js) ]
        |
[ PostgreSQL ] + [ Redis Cache ] + [ Background Job Queue ]
  (core data)   (score caching)   (score recalculation, reminders)
```

### Engagement Score Formula (Example)
```
Score = (Recency x 0.30) + (Frequency x 0.25) + (Depth x 0.25) + (Breadth x 0.20)

Where:
  Recency   = Days since last interaction (inverse, capped at 365)
  Frequency = Count of interactions + events in last 12 months
  Depth     = Has community roles (10) + awards (15) + overseas rep (20)
  Breadth   = Number of distinct Areas of Interest engaged
```

---

## Solution 3: AI-Powered Predictive Relationship Intelligence Platform (Most Complex)
**Build time: ~20-28 weeks | Core theme: "Predict, recommend, automate"**

*Includes everything in Solutions 1 & 2, plus:*

### IDENTIFY - AI-Driven Discovery
| Feature | How It Works | Tables Used |
|---|---|---|
| **Smart Stakeholder Matching** | "I need someone passionate about youth mental health with government event experience" -- AI searches across all fields, ranks by relevance | All tables (NLP over descriptions, write-ups, notes) |
| **Hidden Connection Detection** | AI identifies non-obvious links: stakeholders who attended similar events, share employers, or have complementary AOIs but aren't connected | `Events`, `Community`, `Profiles`, `Areas of Interest` |
| **Auto-Profiling from Unstructured Data** | AI extracts key attributes from free-text fields (Write-up on Individual, Brief Notes, Descriptions) to enrich structured profile | `Profiles`, `Interactions`, `Events`, `Community` |
| **Cross-Agency Deconfliction Alerts** | Auto-alert when 2 agencies are about to engage the same stakeholder in the same week | `Interactions`, `Events` (date fields) |

### ENGAGE - Predictive Analytics
| Feature | How It Works | Tables Used |
|---|---|---|
| **Churn Risk Prediction** | ML model predicts which active stakeholders are likely to disengage in next 90 days based on declining interaction patterns | `Interactions`, `Events` (time-series patterns) |
| **Next Best Action** | AI recommends: "Invite to upcoming Climate Summit" or "Nominate for Youth Award" based on profile + engagement history | All tables |
| **Stakeholder Segmentation** | Auto-cluster stakeholders into segments: Rising Stars, Established Champions, At-Risk, Dormant, New Nominees | All activity tables (ML clustering) |
| **Event-Stakeholder Fit Score** | For upcoming events, AI ranks which stakeholders would benefit most from attending (based on AOI, past attendance, influence level) | `Events`, `Areas of Interest`, `Profiles` |

### GROW & ACTIVATE - Proactive Automation
| Feature | How It Works | Tables Used |
|---|---|---|
| **Automated Engagement Playbooks** | Define triggers: "When a stakeholder receives an award, auto-schedule a congrats call for their RM within 7 days" | `Awards`, `Interactions`, `Relationship Managers` |
| **Goal Tracking per Stakeholder** | Set growth goals: "Move from Level of Interest: Medium to High within 6 months" -- track progress with AI coaching | `Areas of Interest` (Level of Interest, Level of Influence) |
| **Cross-Agency Campaign Orchestration** | Multiple agencies coordinate a joint engagement campaign (e.g., National Day outreach) with shared dashboard, deduplication, and unified tracking | All tables |
| **AI Meeting Prep Brief** | Before a meeting, AI generates a 1-page brief: stakeholder summary, recent activities, suggested talking points, risks/opportunities | All tables |
| **Impact Dashboard for Leadership** | Agency-level and whole-of-government KPIs: total active stakeholders, cross-agency collaboration rate, engagement velocity, stakeholder growth funnel | All tables (aggregated) |

### Architecture
```
[ React/Next.js Frontend + D3.js + AI Chat Interface ]
        |
[ GraphQL API ] + [ AI/ML Microservice (Python/FastAPI) ]
        |                    |
[ PostgreSQL ] + [ Vector DB ] + [ Redis ] + [ Message Queue ]
  (core data)   (embeddings    (cache)    (async jobs,
                  for semantic             playbook triggers,
                  search)                  notifications)
                       |
              [ LLM API (Claude) ]
              (smart matching, briefs,
               next-best-action, NLP)
```

---

## Side-by-Side Comparison

| Dimension | Solution 1 (Dashboard) | Solution 2 (Analytics Hub) | Solution 3 (AI Platform) |
|---|---|---|---|
| **IDENTIFY** | Search + cross-agency flag | Network graph + influence map | AI matching + hidden connections |
| **ENGAGE** | Timeline view | Engagement scoring + trends | Predictive churn + next-best-action |
| **GROW & ACTIVATE** | Last-contact alerts | Journey maps + reminders | Automated playbooks + AI briefs |
| **Build Time** | 4-6 weeks | 10-14 weeks | 20-28 weeks |
| **Team Size** | 2-3 developers | 4-6 developers | 6-10 developers + data scientist |
| **Complexity** | Standard CRUD app | Analytics + real-time scoring | ML pipelines + LLM integration |
| **Infra Cost (monthly)** | ~$200-500 | ~$1,000-2,500 | ~$5,000-15,000 |
| **User Training** | Minimal (1 hr) | Moderate (half day) | Significant (1-2 days) |
| **Quick Win for RMs** | "I can finally see everything in one place" | "I know who to prioritise and who to collaborate with" | "The system tells me what to do next" |

---

## Recommended Approach: Start with Solution 1, Evolve to Solution 2

**Why:**
1. Solution 1 delivers immediate, tangible value -- RMs currently work in silos
2. The cross-agency NRIC linkage alone is a game-changer for deduplication
3. Solution 1's data model and API naturally extends into Solution 2's analytics
4. Solution 2's engagement scoring provides the training data needed for Solution 3's ML

**Suggested Roadmap:**
```
Month 1-2:   Solution 1 (MVP Dashboard)
Month 3-4:   Solution 2a (Engagement Score + Network Graph)
Month 5-6:   Solution 2b (RM Collaboration + Journey Maps)
Month 7-12:  Solution 3 (AI features, rolled out incrementally)
```
