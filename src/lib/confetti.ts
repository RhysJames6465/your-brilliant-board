import confetti from "canvas-confetti";

/**
 * Tasteful, vibrant burst when a task lands in the Completed column.
 * Two angled bursts from the bottom corners create a graceful arc
 * across the board without being obnoxious.
 */
export function celebrateCompletion() {
  const colors = [
    "#7C5CFC", // primary purple
    "#A78BFA", // soft violet
    "#14B8A6", // teal
    "#F59E0B", // amber
    "#EC4899", // pink
  ];

  const defaults = {
    spread: 70,
    ticks: 80,
    gravity: 0.9,
    decay: 0.94,
    startVelocity: 35,
    colors,
    scalar: 0.9,
    zIndex: 9999,
  };

  confetti({
    ...defaults,
    particleCount: 60,
    angle: 60,
    origin: { x: 0.1, y: 0.9 },
  });
  confetti({
    ...defaults,
    particleCount: 60,
    angle: 120,
    origin: { x: 0.9, y: 0.9 },
  });
  // Soft center sparkle
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 40,
      spread: 100,
      startVelocity: 25,
      origin: { x: 0.5, y: 0.7 },
    });
  }, 150);
}
