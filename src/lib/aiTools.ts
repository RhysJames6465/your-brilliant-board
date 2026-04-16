import { supabase } from "@/integrations/supabase/client";
import { TaskStatus } from "@/lib/kanban";
import { celebrateCompletion } from "@/lib/confetti";

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

/** Execute one AI tool call against Supabase. Returns a short result string. */
export async function executeToolCall(call: ToolCall, userId: string): Promise<string> {
  const name = call.function.name;
  let args: any = {};
  try { args = JSON.parse(call.function.arguments || "{}"); } catch {}

  try {
    if (name === "create_task") {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          title: args.title,
          description: args.description ?? null,
          status: (args.status as TaskStatus) ?? "todo",
          category: args.category ?? null,
          due_date: args.due_date ?? null,
          time_estimate: args.time_estimate ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (data?.status === "completed") celebrateCompletion();
      return `Created task "${data.title}" (id ${data.id}) in ${data.status}.`;
    }

    if (name === "update_task") {
      const { id, ...updates } = args;
      if (!id) throw new Error("Missing task id");
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) clean[k] = v;
      }
      const { data, error } = await supabase
        .from("tasks")
        .update(clean as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (clean.status === "completed") celebrateCompletion();
      return `Updated task "${data.title}".`;
    }

    if (name === "move_task") {
      if (!args.id || !args.status) throw new Error("Missing id or status");
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: args.status })
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw error;
      if (args.status === "completed") celebrateCompletion();
      return `Moved "${data.title}" to ${args.status}.`;
    }

    if (name === "delete_task") {
      if (!args.id) throw new Error("Missing id");
      const { error } = await supabase.from("tasks").delete().eq("id", args.id);
      if (error) throw error;
      return `Deleted task ${args.id}.`;
    }

    return `Unknown tool: ${name}`;
  } catch (e: any) {
    return `Error in ${name}: ${e.message || String(e)}`;
  }
}
