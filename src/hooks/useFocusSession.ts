import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useStartFocusSession() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (task_id: string) => {
      const { data, error } = await supabase
        .from("focus_sessions")
        .insert({ task_id, user_id: user!.id, started_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useEndFocusSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      duration_seconds,
      completed_task,
      task_id,
    }: {
      id: string;
      duration_seconds: number;
      completed_task: boolean;
      task_id: string;
    }) => {
      const { error } = await supabase
        .from("focus_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds,
          completed_task,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["focus_total", vars.task_id] });
    },
  });
}

export function useTaskTotalFocusTime(taskId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["focus_total", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("duration_seconds")
        .eq("task_id", taskId!);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
    },
    enabled: !!user && !!taskId,
  });
}
