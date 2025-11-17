// Utility to play notification sound using Web Audio API
let audioContext: AudioContext | null = null;

export function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playNotificationSound() {
  try {
    const context = initAudioContext();
    
    // Create a pleasant notification sound (two-tone beep)
    const now = context.currentTime;
    
    // First tone
    const oscillator1 = context.createOscillator();
    const gainNode1 = context.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(context.destination);
    
    oscillator1.frequency.value = 800; // Higher frequency
    oscillator1.type = 'sine';
    
    gainNode1.gain.setValueAtTime(0, now);
    gainNode1.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    oscillator1.start(now);
    oscillator1.stop(now + 0.15);
    
    // Second tone (slightly lower)
    const oscillator2 = context.createOscillator();
    const gainNode2 = context.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(context.destination);
    
    oscillator2.frequency.value = 600; // Lower frequency
    oscillator2.type = 'sine';
    
    gainNode2.gain.setValueAtTime(0, now + 0.15);
    gainNode2.gain.linearRampToValueAtTime(0.3, now + 0.16);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    oscillator2.start(now + 0.15);
    oscillator2.stop(now + 0.35);
    
    console.log('🔔 Notification sound played');
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}
