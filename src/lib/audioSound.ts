/**
 * Web Audio API Chime & Alerts
 * Zero external audio files required. Safe for all modern browsers.
 */

export function playCashierChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Pleasant high chime 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const now = ctx.currentTime;

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Pleasant high chime 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Graceful fallback if autoplay restrictions apply
  }
}

export function playSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // --- Efek Suara Cash Register / Uang Cek-ring Natural ---
    // 1. Suara "Cek" / Lever mekanis laci kasir terbuka (snap perkusi frekuensi rendah & klik)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(320, now);
    clickOsc.frequency.exponentialRampToValueAtTime(80, now + 0.05);
    clickGain.gain.setValueAtTime(0.25, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);

    // 2. Bell koin perak pertama (Chime nada tinggi jernih ~2093 Hz / C7)
    const bell1 = ctx.createOscillator();
    const bellGain1 = ctx.createGain();
    bell1.type = 'sine';
    bell1.frequency.setValueAtTime(2093, now + 0.04);
    bellGain1.gain.setValueAtTime(0.3, now + 0.04);
    bellGain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    bell1.connect(bellGain1);
    bellGain1.connect(ctx.destination);
    bell1.start(now + 0.04);
    bell1.stop(now + 0.55);

    // 3. Bell koin perak kedua ("Ring" harmoni lebih tinggi ~3135 Hz / G7 berkilau)
    const bell2 = ctx.createOscillator();
    const bellGain2 = ctx.createGain();
    bell2.type = 'sine';
    bell2.frequency.setValueAtTime(3135.96, now + 0.07);
    bellGain2.gain.setValueAtTime(0.22, now + 0.07);
    bellGain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    bell2.connect(bellGain2);
    bellGain2.connect(ctx.destination);
    bell2.start(now + 0.07);
    bell2.stop(now + 0.7);

    // 4. Gemerincing koin logam (subtle metal resonance shimmer ~4186 Hz / C8)
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(4186, now + 0.09);
    shimmerGain.gain.setValueAtTime(0.12, now + 0.09);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + 0.09);
    shimmer.stop(now + 0.45);
  } catch {
    // Fallback jika autoplay restriction aktif di browser
  }
}
