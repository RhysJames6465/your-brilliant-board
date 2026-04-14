
# Kanban Board — Full-Featured Task Manager

## Design Style
Inspired by the reference images: clean white cards on a light background, purple/indigo accent colors, dark sidebar navigation, colored category tags, progress indicators, and avatar displays. Modern, polished, and interactive.

## Core Layout
- **Dark sidebar** (left) with navigation icons: Home, Board, Calendar, Settings
- **Top bar** with search, notifications, and user profile avatar/name
- **Main area** with the Kanban board (3 columns: To-Do, In Progress, Completed)
- **Right sidebar** with board stats: total tasks, completed count, in-progress count, and a donut chart showing completion percentage

## Kanban Board Features
- **3 columns**: To-Do, In Progress, Completed — each with a task count badge
- **Task cards** showing: title, description, due date, time estimate, and color-coded category tags (e.g. "Design", "Development", "Media")
- **Full drag & drop** between columns and within columns for reordering (using @hello-pangea/dnd)
- **Add Task** button opens a modal/dialog to create new tasks with all fields
- **Edit & delete** tasks via a card menu (three-dot icon)

## AI Chat Widget
- **Bottom-right floating chat bubble** that expands into a chat panel
- Full AI assistant for task management — can answer questions, suggest tasks, summarize board status, and provide insights
- Powered by Lovable AI via a Supabase Edge Function
- Streaming responses rendered with markdown support

## Authentication
- Email/password login & signup pages
- Password reset flow with dedicated reset page
- Protected routes — redirect to login if not authenticated

## User Profiles
- Profiles table with display name and avatar URL
- Auto-created on signup via database trigger
- Profile settings page to update name and avatar

## Database (Supabase)
- **profiles** table: id, user_id, display_name, avatar_url
- **tasks** table: id, user_id, title, description, status (to-do/in-progress/completed), due_date, time_estimate, category, position (for ordering), created_at, updated_at
- Row-Level Security so each user only sees their own tasks
- Real-time subscriptions to keep the board in sync

## Pages
1. **Login / Signup** — clean auth forms
2. **Board** (main page) — the Kanban view with sidebar + stats
3. **Settings** — profile management (name, avatar)
