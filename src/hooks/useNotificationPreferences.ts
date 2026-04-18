import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type NotificationPrefs = {
  id: string;
  user_id: string;
  enabled: boolean;
  notify_due_today: boolean;
  notify_due_tomorrow: boolean;
  notify_overdue: boolean;
  daily_reminder_time: string; // "HH:MM:SS"
  muted_until: string | null;
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification_preferences", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NotificationPrefs | null> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Lazy-create if missing (safety net for users who pre-existed the trigger)
        const { data: created, error: insErr } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user!.id })
          .select()
          .single();
        if (insErr) throw insErr;
        return created as NotificationPrefs;
      }
      return data as NotificationPrefs;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<NotificationPrefs, "id" | "user_id">>) => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .update(patch)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification_preferences", user?.id] });
      toast.success("Notification settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
