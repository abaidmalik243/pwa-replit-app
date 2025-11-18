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
    const now = context.currentTime;
    
    // Create a louder, longer notification sound (5+ seconds)
    // This creates a pleasant multi-tone notification that's attention-grabbing
    
    const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Envelope: fade in quickly, sustain, fade out
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    // Create a sequence of tones for a 5-second notification
    // Pattern: High-Low-High-Low-High (attention-grabbing pattern)
    const basVolume = 0.5; // Louder volume (0.5 = 50% max volume)
    
    // First tone (high)
    playTone(880, now, 0.4, basVolume);
    
    // Second tone (low)
    playTone(660, now + 0.5, 0.4, basVolume);
    
    // Third tone (high)
    playTone(880, now + 1.0, 0.4, basVolume);
    
    // Fourth tone (low)
    playTone(660, now + 1.5, 0.4, basVolume);
    
    // Fifth tone (high - longer)
    playTone(880, now + 2.0, 0.6, basVolume);
    
    // Sixth tone (medium)
    playTone(770, now + 2.7, 0.6, basVolume);
    
    // Seventh tone (high - sustained)
    playTone(880, now + 3.4, 0.8, basVolume);
    
    // Final tone (very high - attention!)
    playTone(1046, now + 4.3, 1.0, basVolume * 1.2);
    
    console.log('🔔 Loud notification sound played (5+ seconds)');
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}
