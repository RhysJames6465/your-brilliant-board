import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Task, TaskStatus } from "@/lib/kanban";
import { toast } from "@/hooks/use-toast";

export function useTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      status?: TaskStatus;
      category?: string;
      due_date?: string;
      time_estimate?: string;
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...task, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useBulkUpdatePositions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; position: number; status: TaskStatus }[]) => {
      const promises = updates.map(u =>
        supabase.from("tasks").update({ position: u.position, status: u.status }).eq("id", u.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
