import { useEffect, useMemo, useRef } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import {
  getAlerts,
  fireGroupedNotification,
  shouldNotify,
  notificationsSupported,
  TaskAlert,
} from "@/lib/notifications";

export function useTaskAlerts() {
  const { data: tasks = [] } = useTasks();
  const { data: prefs } = useNotificationPreferences();
  const firedRef = useRef(false);

  const alerts: TaskAlert[] = useMemo(() => getAlerts(tasks), [tasks]);

  const filtered = useMemo(() => {
    if (!prefs?.enabled) return alerts;
    return alerts.filter(a => {
      if (a.bucket === "overdue" && !prefs.notify_overdue) return false;
      if (a.bucket === "today" && !prefs.notify_due_today) return false;
      if (a.bucket === "tomorrow" && !prefs.notify_due_tomorrow) return false;
      return true;
    });
  }, [alerts, prefs]);

  useEffect(() => {
    if (!prefs || !prefs.enabled) return;
    if (!notificationsSupported() || Notification.permission !== "granted") return;
    if (prefs.muted_until && new Date(prefs.muted_until).getTime() > Date.now()) return;
    if (firedRef.current) return;
    if (filtered.length === 0) return;

    const toFire = filtered.filter(a => shouldNotify(a.task.id, a.bucket));
    if (toFire.length === 0) {
      firedRef.current = true;
      return;
    }
    fireGroupedNotification(toFire);
    firedRef.current = true;
  }, [filtered, prefs]);

  const counts = useMemo(() => ({
    overdue: alerts.filter(a => a.bucket === "overdue").length,
    today: alerts.filter(a => a.bucket === "today").length,
    tomorrow: alerts.filter(a => a.bucket === "tomorrow").length,
    total: alerts.length,
  }), [alerts]);

  return { alerts, counts, prefs };
}
