

# Fix: Connect AI Assistant to Board Data

## Problem
The AI assistant cannot see the user's tasks. The edge function only receives chat messages and has a system prompt that says "let them know you can see their board context when they share it" — but there's no mechanism to actually share it.

## Solution
Inject the user's current board data into every AI request so the assistant always has full context.

### 1. Frontend — Send tasks with each message (Assistant.tsx + AIChatWidget.tsx)
- Import `useTasks` hook in both the Assistant page and the AIChatWidget
- When sending a message, fetch current tasks and include them in the request body as `{ messages, tasks }`
- Tasks array includes title, description, status, category, due_date, time_estimate

### 2. Edge Function — Inject task context into system prompt (chat/index.ts)
- Accept `tasks` from the request body alongside `messages`
- Build a dynamic system prompt section that lists all tasks grouped by status (To-Do, In Progress, Completed) with their details (title, description, due date, category, time estimate)
- Update the system prompt to tell the AI it has full access to the user's board data and can answer questions about specific tasks, deadlines, workload, etc.

### Technical Details

**Frontend change** (both Assistant.tsx and AIChatWidget.tsx):
```typescript
const { data: tasks } = useTasks();
// In sendMessage, include tasks in the fetch body:
body: JSON.stringify({ messages: allMessages, tasks: tasks || [] })
```

**Edge function change** (chat/index.ts):
- Parse `tasks` from request body
- Format tasks into a readable context string grouped by column
- Prepend to system prompt so the AI always knows the user's current board state
- Update system prompt instructions to reference that it can see tasks directly

This is a small change across 3 files with no database or migration changes needed.

