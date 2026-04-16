import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ReactMarkdown from "react-markdown";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { streamChat, ChatMsg } from "@/lib/chatStream";

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: tasks } = useTasks();
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;
    const userMsg: ChatMsg = { role: "user", content: input.trim() };
    const base = [...messages, userMsg];
    setMessages(base);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const final = await streamChat(base, {
        onTextChunk: upsert,
        onToolStart: (n) => { setToolStatus(n); assistantSoFar = ""; },
        getTasks: () => tasks || [],
        userId: user.id,
        qc,
      });
      setMessages(final);
    } catch (e: any) {
      upsert(`\n\n*Error: ${e.message}*`);
    }
    setToolStatus(null);
    setLoading(false);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b flex items-center px-4 lg:px-6 bg-card">
            <SidebarTrigger />
            <div className="flex items-center gap-2 ml-3">
              <Bot className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">AI Assistant</h1>
            </div>
          </header>

          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 scrollbar-thin">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">TaskFlow AI Assistant</h2>
                  <p className="text-sm max-w-md">
                    I can help you manage tasks, suggest priorities, break down projects, summarize your board, and give productivity tips. Ask me anything!
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-lg">
                    {[
                      "Help me break down a project into tasks",
                      "What's a good daily productivity routine?",
                      "Suggest task categories for a marketing campaign",
                      "How should I prioritize my tasks?",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); }}
                        className="text-left text-sm px-4 py-3 rounded-xl border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 lg:p-6 border-t bg-card">
              <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-3 max-w-3xl mx-auto">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask me anything about task management..."
                  className="flex-1 h-11 text-sm"
                  disabled={loading}
                />
                <Button type="submit" size="default" className="h-11 px-5" disabled={loading || !input.trim()}>
                  <Send className="w-4 h-4 mr-2" /> Send
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
