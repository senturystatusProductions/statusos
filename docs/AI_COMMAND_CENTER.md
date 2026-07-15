# StatusOS AI Command Center

## Purpose

The AI Command Center is the intelligence layer for StatusOS. It should understand approved business context and help the user decide and act.

## Initial Modes

- General Chat
- Business Coach
- CRM Assistant
- Marketing
- Sales
- Content Creator
- Project Manager
- Producer
- Mix Engineer
- Sound Designer
- Developer

## Operating Pattern

```text
User request
  |
  v
Select specialist
  |
  v
Load approved context
  |
  v
Generate recommendation
  |
  v
Ask for confirmation before write actions
  |
  v
Perform action and log result
```

## Guardrails

- AI may read only data the current user is allowed to access.
- AI must not silently send emails, delete data, or modify records.
- Write actions require explicit user approval.
- Tool results should be clearly separated from generated text.
- Memory should be reviewable and removable.
