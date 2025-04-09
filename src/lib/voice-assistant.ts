/**
 * Voice assistant for accessibility features
 */

export interface VoiceAssistantOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export class VoiceAssistant {
  private static instance: VoiceAssistant;
  private synthesis: SpeechSynthesis | null = null;
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private options: VoiceAssistantOptions = {
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: ''
  };
  private commandCallbacks: Map<string, (args?: string) => void> = new Map();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      
      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        
        this.recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.toLowerCase().trim();
          this.processCommand(transcript);
        };
        
        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };
        
        this.recognition.onend = () => {
          if (this.isListening) {
            // Restart recognition if it's supposed to be listening
            this.recognition?.start();
          }
        };
      }
    }
  }

  public static getInstance(): VoiceAssistant {
    if (!VoiceAssistant.instance) {
      VoiceAssistant.instance = new VoiceAssistant();
    }
    return VoiceAssistant.instance;
  }

  public setOptions(options: VoiceAssistantOptions): void {
    this.options = { ...this.options, ...options };
  }

  public speak(text: string, immediate: boolean = false): void {
    if (!this.synthesis) return;
    
    // Cancel current speech if immediate
    if (immediate && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.options.rate || 1;
    utterance.pitch = this.options.pitch || 1;
    utterance.volume = this.options.volume || 1;
    
    // Set voice if specified
    if (this.options.voice) {
      const voices = this.synthesis.getVoices();
      const selectedVoice = voices.find(voice => voice.name === this.options.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }
    
    this.synthesis.speak(utterance);
  }

  public startListening(): boolean {
    if (!this.recognition) return false;
    
    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  public stopListening(): void {
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  public registerCommand(command: string, callback: (args?: string) => void): void {
    this.commandCallbacks.set(command.toLowerCase(), callback);
  }

  public unregisterCommand(command: string): void {
    this.commandCallbacks.delete(command.toLowerCase());
  }

  private processCommand(transcript: string): void {
    console.log('Processing voice command:', transcript);
    
    // Check for exact command matches
    for (const [command, callback] of this.commandCallbacks.entries()) {
      if (transcript === command) {
        callback();
        return;
      }
    }
    
    // Check for commands with arguments
    for (const [command, callback] of this.commandCallbacks.entries()) {
      if (transcript.startsWith(command + ' ')) {
        const args = transcript.substring(command.length).trim();
        callback(args);
        return;
      }
    }
    
    // Check for commands contained within the transcript
    for (const [command, callback] of this.commandCallbacks.entries()) {
      if (command === '*') {
        callback(transcript);
        return;
      }
      
      if (transcript.includes(command)) {
        callback();
        return;
      }
    }
    
    // No command matched
    this.speak("I didn't understand that command. Please try again.");
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis ? this.synthesis.getVoices() : [];
  }

  public isSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  public pauseSpeech(): void {
    if (this.synthesis) this.synthesis.pause();
  }

  public resumeSpeech(): void {
    if (this.synthesis) this.synthesis.resume();
  }

  public cancelSpeech(): void {
    if (this.synthesis) this.synthesis.cancel();
  }
}

// Helper functions for common voice commands
export function setupNavigationVoiceCommands(voiceAssistant: VoiceAssistant, navigate: (path: string) => void): void {
  voiceAssistant.registerCommand('go to map', () => navigate('/'));
  voiceAssistant.registerCommand('show map', () => navigate('/'));
  voiceAssistant.registerCommand('go to profile', () => navigate('/profile'));
  voiceAssistant.registerCommand('show profile', () => navigate('/profile'));
  voiceAssistant.registerCommand('add place', () => navigate('/add-place'));
  voiceAssistant.registerCommand('search', (query) => {
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      voiceAssistant.speak('What would you like to search for?');
    }
  });
  voiceAssistant.registerCommand('find', (query) => {
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      voiceAssistant.speak('What would you like to find?');
    }
  });
  voiceAssistant.registerCommand('navigate to', (destination) => {
    if (destination) {
      navigate(`/search?q=${encodeURIComponent(destination)}`);
      voiceAssistant.speak(`Searching for ${destination}`);
    } else {
      voiceAssistant.speak('Where would you like to navigate to?');
    }
  });
  voiceAssistant.registerCommand('go back', () => window.history.back());
  voiceAssistant.registerCommand('help', () => {
    voiceAssistant.speak(
      'Available commands: go to map, go to profile, add place, search, find, navigate to, go back, help'
    );
  });
}