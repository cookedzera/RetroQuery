export class SoundEffects {
  private static context: AudioContext | null = null;
  private static initialized = false;

  private static async getContext(): Promise<AudioContext> {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    
    return this.context;
  }

  private static async playTone(frequency: number, duration: number, volume: number = 0.1): Promise<void> {
    try {
      const context = await this.getContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + duration);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration);
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }

  private static async playNoise(duration: number, volume: number = 0.05): Promise<void> {
    try {
      const context = await this.getContext();
      const bufferSize = context.sampleRate * duration;
      const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * volume;
      }
      
      const source = context.createBufferSource();
      const gainNode = context.createGain();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(context.destination);
      
      gainNode.gain.value = volume;
      source.start(context.currentTime);
    } catch (error) {
      console.warn('Noise playback failed:', error);
    }
  }

  static async playTyping(): Promise<void> {
    // Simulate mechanical keyboard click
    const frequencies = [800, 900, 1000, 1100];
    const frequency = frequencies[Math.floor(Math.random() * frequencies.length)];
    await this.playTone(frequency, 0.05, 0.02);
  }

  static async playBeep(): Promise<void> {
    // Classic terminal beep
    await this.playTone(800, 0.2, 0.05);
  }

  static async playStartup(): Promise<void> {
    // Boot sequence sound
    await this.playTone(400, 0.1, 0.03);
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.playTone(600, 0.1, 0.03);
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.playTone(800, 0.2, 0.03);
  }

  static async playError(): Promise<void> {
    // Error sound
    await this.playTone(200, 0.3, 0.05);
  }

  static async playDataLoad(): Promise<void> {
    // Data loading sound with noise
    await this.playNoise(0.5, 0.01);
  }

  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize audio context on user interaction
      await this.getContext();
      this.initialized = true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }
}

// Initialize sound effects on first user interaction
document.addEventListener('click', () => {
  SoundEffects.initialize();
}, { once: true });

document.addEventListener('keydown', () => {
  SoundEffects.initialize();
}, { once: true });
