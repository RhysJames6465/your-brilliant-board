// Parse a time-estimate string into seconds.
// Accepts: "30" (minutes), "2h", "90m", "1h30m", "1.5h", "45 min", "2 hours"
export function parseEstimateToSeconds(estimate: string | null | undefined): number {
  if (!estimate) return 0;
  const s = estimate.toLowerCase().trim();
  if (!s) return 0;

  let total = 0;
  let matched = false;

  const hourMatch = s.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?/);
  if (hourMatch) {
    total += parseFloat(hourMatch[1]) * 3600;
    matched = true;
  }
  const minMatch = s.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?/);
  if (minMatch) {
    total += parseFloat(minMatch[1]) * 60;
    matched = true;
  }

  if (!matched) {
    const num = parseFloat(s);
    if (!isNaN(num)) total = num * 60; // bare number => minutes
  }

  return Math.round(total);
}

export function formatDuration(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = totalSeconds < 0 ? "-" : "";
  if (h > 0) return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHumanDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Soft, brief sine chime via Web Audio API. No external assets.
export function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const tones = [
      { freq: 660, start: 0, dur: 0.35 },
      { freq: 880, start: 0.18, dur: 0.45 },
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = t.freq;
      gain.gain.setValueAtTime(0, now + t.start);
      gain.gain.linearRampToValueAtTime(0.12, now + t.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur + 0.05);
    });

    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    // silent if audio context not available
  }
}
