import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Task {
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
    let s = `  - ${t.title}`;
    if (t.description) s += ` — ${t.description}`;
    if (t.category) s += ` [${t.category}]`;
    if (t.due_date) s += ` (due: ${t.due_date})`;
    if (t.time_estimate) s += ` (est: ${t.time_estimate})`;
    return s;
  };

  let ctx = `\n\n## User's Current Board (${tasks.length} tasks)\n`;
  if (grouped["todo"].length) ctx += `\n**To-Do (${grouped["todo"].length}):**\n${grouped["todo"].map(formatTask).join("\n")}\n`;
  if (grouped["in-progress"].length) ctx += `\n**In Progress (${grouped["in-progress"].length}):**\n${grouped["in-progress"].map(formatTask).join("\n")}\n`;
  if (grouped["completed"].length) ctx += `\n**Completed (${grouped["completed"].length}):**\n${grouped["completed"].map(formatTask).join("\n")}\n`;
  return ctx;
}

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
            content: `You are TaskFlow AI — a smart, friendly task management assistant embedded in a Kanban board app. You have full access to the user's current board data below. Use it to give specific, personalized advice.

You help users:
- Answer questions about their specific tasks, deadlines, and workload
- Suggest priorities and next steps based on their current board
- Create and organize tasks
- Summarize board status and progress
- Provide productivity tips and insights

Keep responses concise, actionable, and encouraging. Use markdown formatting when helpful. Reference specific task titles and details from their board when relevant.${taskContext}`,
          },
          ...messages,
        ],
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
