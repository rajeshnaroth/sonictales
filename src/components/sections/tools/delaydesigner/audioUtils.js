// ============================================================
// Audio utility functions for Web Audio API
// ============================================================

export const scheduleClick = (ctx, frequency, startTime, duration, gain = 1, pan = 0) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const panNode = ctx.createStereoPanner();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(gain * 0.5, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  panNode.pan.setValueAtTime(pan, startTime);
  
  oscillator.connect(gainNode);
  gainNode.connect(panNode);
  panNode.connect(ctx.destination);
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
};
