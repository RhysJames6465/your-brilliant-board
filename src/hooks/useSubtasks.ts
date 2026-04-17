import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Subtask = Tables<"subtasks">;

export function useSubtasks(taskId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subtasks", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", taskId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as Subtask[];
    },
    enabled: !!user && !!taskId,
  });
}

export function useCreateSubtask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ task_id, title, position }: { task_id: string; title: string; position: number }) => {
      const { data, error } = await supabase
        .from("subtasks")
        .insert({ task_id, title, position, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["subtasks", vars.task_id] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean; task_id: string }) => {
      const { error } = await supabase.from("subtasks").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, completed, task_id }) => {
      await qc.cancelQueries({ queryKey: ["subtasks", task_id] });
      const prev = qc.getQueryData<Subtask[]>(["subtasks", task_id]);
      qc.setQueryData<Subtask[]>(["subtasks", task_id], (old) =>
        (old || []).map(s => s.id === id ? { ...s, completed } : s)
      );
      return { prev, task_id };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev && ctx.task_id) qc.setQueryData(["subtasks", ctx.task_id], ctx.prev);
      toast.error(e.message);
    },
    onSettled: (_d, _e, vars) => qc.invalidateQueries({ queryKey: ["subtasks", vars.task_id] }),
  });
}

export function useUpdateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, task_id }: { id: string; title: string; task_id: string }) => {
      const { error } = await supabase.from("subtasks").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["subtasks", vars.task_id] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_id }: { id: string; task_id: string }) => {
      const { error } = await supabase.from("subtasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["subtasks", vars.task_id] }),
    onError: (e: Error) => toast.error(e.message),
  });
}
