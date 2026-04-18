import { Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { ensurePermission, notificationsSupported } from "@/lib/notifications";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function NotificationSettings() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (!notificationsSupported()) setPermission("unsupported");
    else setPermission(Notification.permission);
  }, []);

  if (isLoading || !prefs) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card>;
  }

  const requestPerm = async () => {
    const p = await ensurePermission();
    setPermission(p);
    if (p === "granted") toast.success("Browser notifications enabled");
    else if (p === "denied") toast.error("Notifications blocked. Enable them in your browser settings.");
  };

  const muteFor = (hours: number) => {
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    update.mutate({ muted_until: until });
  };

  const muted = prefs.muted_until && new Date(prefs.muted_until).getTime() > Date.now();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" /> Notifications & Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission */}
        {permission === "unsupported" ? (
          <div className="text-sm text-muted-foreground p-3 rounded-md bg-muted">
            Your browser doesn't support notifications.
          </div>
        ) : permission !== "granted" ? (
          <div className="flex items-center justify-between p-3 rounded-md bg-muted">
            <div className="text-sm">
              <p className="font-medium">Browser notifications {permission === "denied" ? "blocked" : "off"}</p>
              <p className="text-xs text-muted-foreground">
                {permission === "denied"
                  ? "You'll need to allow notifications in your browser site settings."
                  : "Allow notifications to get reminders for due and overdue tasks."}
              </p>
            </div>
            {permission !== "denied" && (
              <Button size="sm" onClick={requestPerm}>Enable</Button>
            )}
          </div>
        ) : (
          <div className="text-sm text-[hsl(173,58%,49%)] p-3 rounded-md bg-[hsl(173,58%,39%)]/10 border border-[hsl(173,58%,39%)]/30">
            ✓ Browser notifications are enabled
          </div>
        )}

        <Separator />

        {/* Master switch */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Enable reminders</Label>
            <p className="text-xs text-muted-foreground">Master switch for all task notifications</p>
          </div>
          <Switch
            checked={prefs.enabled}
            onCheckedChange={(v) => update.mutate({ enabled: v })}
          />
        </div>

        <Separator />

        {/* Types */}
        <div className="space-y-4 opacity-100" style={{ opacity: prefs.enabled ? 1 : 0.5, pointerEvents: prefs.enabled ? "auto" : "none" }}>
          <div className="flex items-center justify-between">
            <Label>Overdue tasks</Label>
            <Switch checked={prefs.notify_overdue} onCheckedChange={(v) => update.mutate({ notify_overdue: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Due today</Label>
            <Switch checked={prefs.notify_due_today} onCheckedChange={(v) => update.mutate({ notify_due_today: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Due tomorrow</Label>
            <Switch checked={prefs.notify_due_tomorrow} onCheckedChange={(v) => update.mutate({ notify_due_tomorrow: v })} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Daily reminder time</Label>
              <p className="text-xs text-muted-foreground">When to fire today's reminders</p>
            </div>
            <Input
              type="time"
              className="w-32"
              value={prefs.daily_reminder_time.slice(0, 5)}
              onChange={(e) => update.mutate({ daily_reminder_time: `${e.target.value}:00` })}
            />
          </div>
        </div>

        <Separator />

        {/* Mute */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="flex items-center gap-2"><BellOff className="w-4 h-4" /> Mute notifications</Label>
            {muted && (
              <Button variant="ghost" size="sm" onClick={() => update.mutate({ muted_until: null })}>
                Unmute
              </Button>
            )}
          </div>
          {muted ? (
            <p className="text-xs text-muted-foreground">
              Muted until {new Date(prefs.muted_until!).toLocaleString()}
            </p>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => muteFor(1)}>1 hour</Button>
              <Button variant="outline" size="sm" onClick={() => muteFor(4)}>4 hours</Button>
              <Button variant="outline" size="sm" onClick={() => muteFor(24)}>1 day</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
