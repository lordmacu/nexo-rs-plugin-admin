// M7.notify.sound — audio cue alongside the OS notification.
//
// Generates a short two-tone "ding" via Web Audio API (no asset
// to ship). Cached AudioContext is lazy-created on the first
// successful play; some browsers (iOS Safari) need a user-
// gesture before the context can resume — the preference toggle
// click is that gesture. Subsequent plays piggyback on the same
// resumed context so background-tab notifications still fire.

let ctx: AudioContext | null = null;

/** Lazy-create + resume the shared AudioContext. Called from
 *  the preference toggle click (a user gesture) so iOS Safari
 *  unblocks the context. Subsequent `playBeep()` calls reuse
 *  the same context without needing another gesture. */
export async function primeAudioContext(): Promise<void> {
  if (typeof window === "undefined") return;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* swallow — we'll just no-op on play */
    }
  }
}

/** Fire a brief two-tone beep. Silently no-ops when the audio
 *  context isn't primed yet (gesture not received) or the
 *  browser doesn't expose Web Audio. */
export function playBeep(): void {
  if (!ctx || ctx.state !== "running") return;
  try {
    const now = ctx.currentTime;
    // Tone 1: 880 Hz for 80 ms; tone 2: 1320 Hz for 120 ms.
    fire_tone(ctx, 880, now, 0.08, 0.12);
    fire_tone(ctx, 1320, now + 0.09, 0.12, 0.1);
  } catch {
    /* swallow — never let a failed beep break event ingest */
  }
}

function fire_tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration_s: number,
  peak_gain: number,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ac.destination);
  // Quick attack + decay envelope to avoid harsh clicks.
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak_gain, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration_s);
  osc.start(start);
  osc.stop(start + duration_s + 0.02);
}
