import { todayISO } from '@/lib/utils'

export interface NoteTemplate {
  id: string
  name: string
  emoji: string
  description: string
  folder: string          // GitHub folder inside markdownlod/
  tags: string[]
  generate: (vars?: Record<string, string>) => string
}

const today = () => todayISO()
const year = () => new Date().getFullYear()

// ─── Basic Memory compatible markdown ────────────────────────────────────────
export const NOTE_TEMPLATES: NoteTemplate[] = [

  // ── DAILY JOURNAL ─────────────────────────────────────────────────────────
  {
    id: 'daily-journal',
    name: 'Daily Journal',
    emoji: '📓',
    description: 'Daily reflection with mood, gratitude, intentions & review',
    folder: 'journal',
    tags: ['journal', 'daily'],
    generate: (v = {}) => `# ${v.title || `Journal — ${today()}`}

${v.content || 'Write your thoughts freely here. What happened today? How are you feeling? What\'s on your mind?'}

## Mood & Energy
- **Mood:** ${v.mood || '😐 Neutral'}
- **Energy:** ${v.energy || 'Medium'}
- **Sleep:** ${v.sleep || '7h'}

## Gratitude
- 
- 
- 

## Intentions for Today
- [ ] 
- [ ] 
- [ ] 

## What I Learned Today


## Evening Review
**Best part of today:**


**What I\'d do differently:**


**Tomorrow\'s priority:**


## Observations
- [mood] ${v.mood || 'Neutral'} #daily
- [date] ${today()}

## Relations
- part_of [[Journal ${year()}]]
`,
  },

  // ── BOOK — FICTION ────────────────────────────────────────────────────────
  {
    id: 'book-fiction',
    name: 'Book Notes — Fiction',
    emoji: '📖',
    description: 'Deep reading notes for novels, stories, literature',
    folder: 'books/fiction',
    tags: ['book', 'fiction', 'reading'],
    generate: (v = {}) => `# ${v.title || 'Book Title'}

**Author:** ${v.author || 'Author Name'}
**Genre:** ${v.genre || 'Fiction'}
**Started:** ${v.started || today()}
**Finished:** ${v.finished || ''}
**Rating:** ${v.rating || '⭐⭐⭐⭐'}
**Status:** ${v.status || 'Reading'}

${v.synopsis || 'Write a brief synopsis or your first impressions here.'}

## Why I Read This
${v.reason || 'What drew me to this book?'}

## Characters
| Character | Role | Notes |
|-----------|------|-------|
| | | |
| | | |

## Plot & Structure
### Act 1 — Setup


### Act 2 — Conflict


### Act 3 — Resolution


## Themes & Motifs
- **Theme 1:**
- **Theme 2:**
- **Theme 3:**

## Favourite Passages
> ${v.quote1 || 'Paste a meaningful quote here'}
> — Page

> 

## What Moved Me
(Emotional moments, beautiful sentences, scenes that stayed with me)


## What I Learned About Storytelling


## My Takeaway / Personal Reflection


## Observations
- [rating] ${v.rating || '4/5'} #book #fiction
- [author] ${v.author || ''} 
- [theme] Main theme here #fiction
- [status] ${v.status || 'reading'}

## Relations
- part_of [[Reading List ${year()}]]
- relates_to [[Books by ${v.author || 'Author'}]]
`,
  },

  // ── BOOK — NON-FICTION ────────────────────────────────────────────────────
  {
    id: 'book-nonfiction',
    name: 'Book Notes — Non-Fiction',
    emoji: '📚',
    description: 'Knowledge extraction from non-fiction books',
    folder: 'books/nonfiction',
    tags: ['book', 'nonfiction', 'learning'],
    generate: (v = {}) => `# ${v.title || 'Book Title'}

**Author:** ${v.author || 'Author Name'}
**Category:** ${v.category || 'Self-help / Business / Science'}
**Started:** ${v.started || today()}
**Finished:** ${v.finished || ''}
**Rating:** ${v.rating || '⭐⭐⭐⭐'}
**Status:** ${v.status || 'Reading'}

## The Big Idea
${v.bigIdea || 'What is the central thesis of this book? What problem does it solve?'}

## Why I Read This
${v.reason || 'What made me pick this up?'}

## Core Concepts
### Concept 1: 


### Concept 2: 


### Concept 3: 


## Key Mental Models & Frameworks


## Actionable Insights
- [ ] 
- [ ] 
- [ ] 

## Best Quotes & Highlights
> ${v.quote1 || 'Key quote from the book'}

> 

## Chapter-by-Chapter Notes
| Chapter | Key Point | My Reaction |
|---------|-----------|-------------|
| | | |
| | | |

## How This Changes My Thinking


## What I\'ll Apply This Week


## What I Disagree With or Question


## Recommended For


## Observations
- [rating] ${v.rating || '4/5'} #book #nonfiction
- [author] ${v.author || ''}
- [insight] Main actionable insight #nonfiction
- [concept] Key framework or mental model #learning
- [status] ${v.status || 'reading'}

## Relations
- part_of [[Reading List ${year()}]]
- relates_to [[${v.category || 'Self-Help'}]]
`,
  },

  // ── COURSE / TRAINING ─────────────────────────────────────────────────────
  {
    id: 'course',
    name: 'Course Notes',
    emoji: '🎓',
    description: 'Structured learning notes for courses, certifications, tutorials',
    folder: 'courses',
    tags: ['course', 'learning', 'certification'],
    generate: (v = {}) => `# ${v.title || 'Course Name'}

**Platform:** ${v.platform || 'Coursera / Udemy / YouTube / etc.'}
**Instructor:** ${v.instructor || ''}
**Category:** ${v.category || 'Marketing / AI / Technology'}
**Started:** ${v.started || today()}
**Completed:** ${v.completed || ''}
**Certificate:** ${v.certificate || 'No'}
**Status:** ${v.status || 'In Progress'}
**Progress:** ${v.progress || '0%'}

## Why I\'m Taking This
${v.reason || 'What skill gap does this fill? How does it connect to my goals?'}

## What I Want to Learn
- 
- 
- 

## Module Notes
### Module 1: 
**Key points:**
- 
- 

**My questions:**
- 

---

### Module 2: 
**Key points:**
- 

---

## Key Concepts Learned
| Concept | Explanation | Example |
|---------|-------------|---------|
| | | |
| | | |

## Tools / Resources Introduced
- 
- 

## Assignments & Projects
- [ ] 
- [ ] 

## What I\'ll Apply at Work (Limerickbd / BFF)


## Connections to Other Learning
(How does this connect to what I already know?)

## Certificate / Proof of Completion
${v.certificateUrl || ''}

## Observations
- [skill] Main skill gained #course
- [platform] ${v.platform || ''} 
- [instructor] ${v.instructor || ''}
- [status] ${v.status || 'in-progress'}
- [apply] How I\'ll use this at work #career

## Relations
- part_of [[Learning Path ${year()}]]
- relates_to [[${v.category || 'Digital Marketing'}]]
`,
  },

  // ── AI / MARKETING SKILL ──────────────────────────────────────────────────
  {
    id: 'skill-ai-marketing',
    name: 'AI Marketing Skill',
    emoji: '🤖',
    description: 'AI tool, technique, or strategy for digital marketing',
    folder: 'skills/ai-marketing',
    tags: ['ai', 'marketing', 'skill', 'limtech'],
    generate: (v = {}) => `# ${v.title || 'Skill / Tool Name'}

**Category:** ${v.category || 'AI Tool / Prompt Engineering / Automation'}
**Use Case:** ${v.useCase || 'B2B SaaS / CRM / SFA / ERP Marketing'}
**Date Learned:** ${today()}
**Difficulty:** ${v.difficulty || 'Medium'}

## What It Is
${v.description || 'Describe this AI tool, technique, or skill.'}

## How I Use It at Limerickbd / Limtech
${v.workApplication || 'How does this apply to CRM, SFA, ERP marketing campaigns?'}

## Prompt Template / Workflow
\`\`\`
${v.prompt || '// Your prompt or workflow here'}
\`\`\`

## Example Output
${v.example || 'Paste a real example of the output or result'}

## Before vs After
**Before:** 
**After:** 

## Tools That Work Well With This
- 
- 

## Limitations & Gotchas
- 
- 

## Resources
- 

## Observations
- [technique] ${v.title || 'AI technique'} #ai #marketing
- [tool] Tool name #automation
- [use-case] B2B SaaS application #limtech
- [lesson] Key lesson learned

## Relations
- part_of [[AI Marketing Toolkit]]
- relates_to [[Limtech Content Strategy]]
`,
  },

  // ── PROJECT / CAMPAIGN ────────────────────────────────────────────────────
  {
    id: 'project',
    name: 'Project / Campaign',
    emoji: '🚀',
    description: 'Project or marketing campaign planning and tracking',
    folder: 'projects',
    tags: ['project', 'campaign', 'work'],
    generate: (v = {}) => `# ${v.title || 'Project Name'}

**Client / Brand:** ${v.client || 'Limtech / Limerickbd / BFF'}
**Type:** ${v.type || 'Campaign / Product Launch / Content Series'}
**Start:** ${v.start || today()}
**Deadline:** ${v.deadline || ''}
**Status:** ${v.status || 'Planning'}
**Owner:** Nurul Amin

## Objective
${v.objective || 'What is this project trying to achieve?'}

## Target Audience
${v.audience || 'Who are we speaking to?'}

## Key Message
${v.message || 'One-line campaign message'}

## Deliverables
- [ ] 
- [ ] 
- [ ] 

## Channels
- [ ] Facebook
- [ ] LinkedIn
- [ ] Email
- [ ] Other: 

## Content Plan
| Content | Platform | Due Date | Status |
|---------|----------|----------|--------|
| | | | |
| | | | |

## Budget
**Total budget:** 
**Spent:** 

## KPIs & Metrics
| Metric | Target | Actual |
|--------|--------|--------|
| Reach | | |
| Engagement | | |
| Leads | | |

## Notes & Decisions
- [decision] 

## Post-Campaign Review
**What worked:**
**What to improve:**
**Key result:**

## Observations
- [status] ${v.status || 'planning'} #project
- [client] ${v.client || 'Limtech'} #campaign
- [type] ${v.type || 'campaign'}

## Relations
- part_of [[Limtech Marketing ${year()}]]
- relates_to [[Content Calendar ${year()}]]
`,
  },

  // ── MEETING NOTES ─────────────────────────────────────────────────────────
  {
    id: 'meeting',
    name: 'Meeting Notes',
    emoji: '🤝',
    description: 'Meeting notes with action items and decisions',
    folder: 'meetings',
    tags: ['meeting', 'work'],
    generate: (v = {}) => `# ${v.title || `Meeting — ${today()}`}

**Date:** ${v.date || today()}
**Attendees:** ${v.attendees || ''}
**Type:** ${v.type || 'Team / Client / 1-on-1'}
**Duration:** ${v.duration || ''}

## Agenda
1. 
2. 
3. 

## Discussion Notes
${v.notes || ''}

## Decisions Made
- [decision] 
- [decision] 

## Action Items
| Action | Owner | Due |
|--------|-------|-----|
| | | |
| | | |

## Follow-up Needed
- 

## Observations
- [decision] Key decision #meeting
- [action] Action item assigned
- [date] ${today()} #work

## Relations
- part_of [[Work ${year()}]]
`,
  },

  // ── IDEA / INSIGHT ────────────────────────────────────────────────────────
  {
    id: 'idea',
    name: 'Idea / Insight',
    emoji: '💡',
    description: 'Capture a creative idea, insight or hypothesis',
    folder: 'ideas',
    tags: ['idea', 'insight'],
    generate: (v = {}) => `# ${v.title || 'Idea Title'}

**Date:** ${today()}
**Category:** ${v.category || 'Marketing / Product / Career / Life'}
**Status:** ${v.status || 'Raw idea'}
**Trigger:** ${v.trigger || 'What sparked this idea?'}

## The Core Idea
${v.description || 'Explain the idea fully. Don\'t hold back — write everything you\'re thinking.'}

## Why This Matters
${v.why || ''}

## How It Could Work
${v.how || ''}

## Potential Impact
- **Best case:** 
- **Realistic:** 
- **Effort required:** 

## Open Questions
- ?
- ?

## Related Ideas & Inspirations
- 

## Next Step (if any)
- [ ] 

## Observations
- [idea] Core concept summary #idea
- [status] ${v.status || 'raw'} 
- [category] ${v.category || 'general'}

## Relations
- relates_to [[Ideas Hub]]
`,
  },

  // ── FINANCIAL NOTE ────────────────────────────────────────────────────────
  {
    id: 'finance-note',
    name: 'Financial Note',
    emoji: '💰',
    description: 'Financial planning, budget review, or investment note',
    folder: 'finance',
    tags: ['finance', 'money', 'planning'],
    generate: (v = {}) => `# ${v.title || `Finance Review — ${today()}`}

**Date:** ${today()}
**Period:** ${v.period || 'Monthly / Weekly / Annual'}
**Type:** ${v.type || 'Budget Review / Investment / Goal'}

## Summary
${v.summary || ''}

## Income This Period
| Source | Amount | Notes |
|--------|--------|-------|
| Salary | | |
| Freelance (BFF) | | |
| Other | | |
| **Total** | | |

## Expenses This Period
| Category | Budget | Actual | Variance |
|----------|--------|--------|----------|
| Rent | | | |
| Food | | | |
| Transport | | | |
| Other | | | |
| **Total** | | | |

## Net Savings This Period
**Income:** 
**Expenses:** 
**Net:** 
**Savings Rate:** %

## Financial Goals Progress
- [ ] Goal 1:
- [ ] Goal 2:

## Decisions & Observations
- [decision] 
- [lesson] 

## Next Month Plan
${v.plan || ''}

## Observations
- [period] ${v.period || 'monthly'} #finance
- [net] Net savings amount #money

## Relations
- part_of [[Finance ${year()}]]
`,
  },

  // ── WEEKLY REVIEW ─────────────────────────────────────────────────────────
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    emoji: '🔄',
    description: 'End-of-week reflection and next week planning',
    folder: 'reviews/weekly',
    tags: ['review', 'weekly', 'reflection'],
    generate: (v = {}) => `# Weekly Review — ${v.week || `Week of ${today()}`}

**Period:** ${v.start || ''} → ${v.end || today()}
**Overall:** ${v.overall || '😐 Average'}

## This Week\'s Wins 🏆
- 
- 
- 

## What I Learned 🎓
- 
- 

## What Didn\'t Go Well
- 
- 

## Energy & Mood Trend
- Monday: 
- Tuesday: 
- Wednesday: 
- Thursday: 
- Friday: 

## Work (Limerickbd / Limtech)
**Completed:**
**In Progress:**
**Blocked:**

## Freelance (BFF)
**Completed:**
**Upcoming:**

## Health & Personal
- Exercise: 
- Sleep avg: 
- Diet: 

## Next Week\'s Priorities
1. 
2. 
3. 

## One Word to Describe This Week
${v.word || ''}

## Observations
- [win] Top win of the week #review
- [learning] Key learning #weekly
- [priority] Top priority for next week
- [week] ${v.week || today()} 

## Relations
- part_of [[Weekly Reviews ${year()}]]
- relates_to [[Journal ${year()}]]
`,
  },

  // ── PERSON / CONTACT ──────────────────────────────────────────────────────
  {
    id: 'person',
    name: 'Person / Contact',
    emoji: '👤',
    description: 'Notes about a person — colleague, mentor, contact',
    folder: 'people',
    tags: ['person', 'network'],
    generate: (v = {}) => `# ${v.name || 'Person Name'}

**Role:** ${v.role || ''}
**Company:** ${v.company || ''}
**Met:** ${v.met || today()}
**Context:** ${v.context || 'How did we meet?'}

## About
${v.about || ''}

## Why This Connection Matters
${v.why || ''}

## What They Can Help With
- 

## What I Can Help With
- 

## Conversation Notes
| Date | Topic | Action |
|------|-------|--------|
| ${today()} | | |

## Their Interests & Expertise
- 

## Observations
- [role] ${v.role || ''} #person
- [company] ${v.company || ''}
- [met] ${today()} #network

## Relations
- relates_to [[Network Map]]
`,
  },
]

export const getTemplateById = (id: string) => NOTE_TEMPLATES.find(t => t.id === id)

export const TEMPLATE_FOLDERS = [
  'journal',
  'books/fiction',
  'books/nonfiction',
  'courses',
  'skills/ai-marketing',
  'projects',
  'meetings',
  'ideas',
  'finance',
  'reviews/weekly',
  'people',
  'roadmaps',
]
