import { Task } from "@/lib/kanban";
import { executeToolCall, ToolCall } from "@/lib/aiTools";
import { QueryClient } from "@tanstack/react-query";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const AUTH = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

export type ChatMsg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

type Callbacks = {
  onTextChunk: (chunk: string) => void;
  onToolStart?: (name: string) => void;
  getTasks: () => Task[];
  userId: string;
  qc: QueryClient;
};

/**
 * Streams a chat completion. If the assistant emits tool_calls, we execute
 * them, append tool results, and recurse until the assistant responds with
 * plain text only. Returns the full updated message list.
 */
export async function streamChat(
  messages: ChatMsg[],
  cb: Callbacks,
  depth = 0
): Promise<ChatMsg[]> {
  if (depth > 4) return messages;

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({ messages, tasks: cb.getTasks() }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `Error ${resp.status}`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let textSoFar = "";
  // Accumulate tool calls by index
  const toolAcc: Record<number, { id?: string; name?: string; args: string }> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") break;
      try {
        const parsed = JSON.parse(json);
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          textSoFar += delta.content;
          cb.onTextChunk(delta.content);
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolAcc[idx]) toolAcc[idx] = { args: "" };
            if (tc.id) toolAcc[idx].id = tc.id;
            if (tc.function?.name) toolAcc[idx].name = tc.function.name;
            if (tc.function?.arguments) toolAcc[idx].args += tc.function.arguments;
          }
        }
      } catch {}
    }
  }

  const toolCalls: ToolCall[] = Object.values(toolAcc)
    .filter((t) => t.id && t.name)
    .map((t) => ({
      id: t.id!,
      type: "function",
      function: { name: t.name!, arguments: t.args },
    }));

  // No tool calls → done
  if (toolCalls.length === 0) {
    return [...messages, { role: "assistant", content: textSoFar }];
  }

  // Execute all tools
  const assistantMsg: ChatMsg = {
    role: "assistant",
    content: textSoFar,
    tool_calls: toolCalls,
  };
  const toolMsgs: ChatMsg[] = [];
  for (const call of toolCalls) {
    cb.onToolStart?.(call.function.name);
    const result = await executeToolCall(call, cb.userId);
    toolMsgs.push({ role: "tool", tool_call_id: call.id, content: result });
  }

  // Refresh board UI
  cb.qc.invalidateQueries({ queryKey: ["tasks"] });

  // Recurse with updated messages so the model can respond to tool results
  return streamChat([...messages, assistantMsg, ...toolMsgs], cb, depth + 1);
}
