import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Task {
  id?: string;
  title: string;
  description?: string;
  status: string;
  category?: string;
  due_date?: string;
  time_estimate?: string;
}

function buildTaskContext(tasks: Task[]): string {
  if (!tasks || tasks.length === 0) return "\n\nThe user has no tasks on their board yet.";

  const grouped: Record<string, Task[]> = { "todo": [], "in-progress": [], "completed": [] };
  for (const t of tasks) {
    (grouped[t.status] || grouped["todo"]).push(t);
  }

  const formatTask = (t: Task) => {
    let s = `  - [${t.id}] ${t.title}`;
    if (t.description) s += ` — ${t.description}`;
    if (t.category) s += ` {${t.category}}`;
    if (t.due_date) s += ` (due: ${t.due_date})`;
    if (t.time_estimate) s += ` (est: ${t.time_estimate})`;
    return s;
  };

  let ctx = `\n\n## User's Current Board (${tasks.length} tasks)\nEach task is shown as [id] title. Use the id with update_task / delete_task / move_task.\n`;
  if (grouped["todo"].length) ctx += `\n**To-Do (${grouped["todo"].length}):**\n${grouped["todo"].map(formatTask).join("\n")}\n`;
  if (grouped["in-progress"].length) ctx += `\n**In Progress (${grouped["in-progress"].length}):**\n${grouped["in-progress"].map(formatTask).join("\n")}\n`;
  if (grouped["completed"].length) ctx += `\n**Completed (${grouped["completed"].length}):**\n${grouped["completed"].map(formatTask).join("\n")}\n`;
  return ctx;
}

const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task on the user's board.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["todo", "in-progress", "completed"], description: "Defaults to 'todo'." },
          category: { type: "string", description: "One of: Design, Development, Media, Research, Marketing, Personal, Other" },
          due_date: { type: "string", description: "ISO date YYYY-MM-DD" },
          time_estimate: { type: "string", description: "e.g. '2h', '30m'" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update an existing task's fields by id.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["todo", "in-progress", "completed"] },
          category: { type: "string" },
          due_date: { type: "string" },
          time_estimate: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_task",
      description: "Move a task to a different column (status).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["todo", "in-progress", "completed"] },
        },
        required: ["id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete a task from the board by id.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, tasks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const taskContext = buildTaskContext(tasks || []);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are TaskFlow AI — a smart, friendly task management assistant embedded in a Kanban board app called Work Planner. You have full access to the user's current board data below AND the ability to edit it directly via tools.

You can:
- Answer questions about tasks, deadlines, workload
- Suggest priorities and next steps
- **Create, update, move, and delete tasks** using the provided tools (create_task, update_task, move_task, delete_task)
- Summarize progress and give productivity tips

Guidelines for editing:
- When the user asks you to add/change/move/remove tasks, USE THE TOOLS — don't just describe what you'd do.
- For batch operations (e.g. "add 3 tasks"), call the tool multiple times in one turn.
- Use task ids exactly as shown in the board context below.
- After tool calls succeed, give a short, friendly confirmation.
- If the user's intent is ambiguous, ask one quick clarifying question before editing.

Keep responses concise and use markdown when helpful.${taskContext}`,
          },
          ...messages,
        ],
        tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
