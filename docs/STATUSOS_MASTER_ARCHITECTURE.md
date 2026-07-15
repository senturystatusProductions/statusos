# StatusOS Master Architecture v1.0

**Project:** StatusOS  
**Codename:** Maestro  
**Purpose:** AI-powered music business operating system for producers, engineers, artists, and labels.

## Product Principle

StatusOS has two layers:

1. **Business tools:** Dashboard, CRM, Content, Sales, Projects, Revenue, Goals, Templates.
2. **AI Command Center:** The intelligence layer that reads approved StatusOS data, recommends actions, and eventually performs user-approved actions.

## Core Modules

- Dashboard
- Artist CRM
- Content Planner
- Sales Pipeline
- Projects
- Revenue
- Goals
- DM Templates
- AI Command Center
- Settings
- Developer Dashboard

## AI Specialists

- Business Coach
- CRM Assistant
- Producer Assistant
- Mix Engineer
- Sound Designer
- Marketing Assistant
- Sales Assistant
- Content Creator
- Email Writer
- Project Manager
- Developer Assistant

## Architecture

```text
Browser
  |
  v
StatusOS Frontend
  |
  v
Supabase Authentication + Database + Edge Functions
  |
  v
OpenAI Responses API
```

## Security Rules

- Never place secret keys in `app.js`, `config.js`, HTML, or GitHub.
- OpenAI requests must go through a server-side Supabase Edge Function.
- Every database row should be scoped to the authenticated user.
- Use Row Level Security for all user-owned tables.
- Require authentication for private AI requests.
- Log failures without exposing secrets or personal data.

## Memory Layers

1. **Conversation memory:** Current chat context.
2. **Business memory:** Artists, projects, revenue, goals, and recurring business facts.
3. **Producer memory:** Preferred genres, VSTs, sound-design habits, and production workflow.

## Development Direction

StatusOS AI is an AI Command Center, not a generic chatbot. Each release should connect the AI to one clearly defined business capability while preserving security, stability, and rollback support.
