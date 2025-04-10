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
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognitionTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      
      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = false;
          this.recognition.interimResults = false;
          this.recognition.lang = 'en-US';
          
          this.recognition.onresult = (event: any) => {
            try {
              const transcript = event.results[0][0].transcript.toLowerCase().trim();
              console.log("Voice command received:", transcript);
              this.processCommand(transcript);
            } catch (error) {
              console.error("Error processing speech recognition result:", error);
            }
          };
          
          this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            // Clear timeout if there was an error
            if (this.recognitionTimeout) {
              clearTimeout(this.recognitionTimeout);
              this.recognitionTimeout = null;
            }
          };
          
          this.recognition.onend = () => {
            // Clear timeout when recognition ends naturally
            if (this.recognitionTimeout) {
              clearTimeout(this.recognitionTimeout);
              this.recognitionTimeout = null;
            }
            
            if (this.isListening) {
              // Restart recognition if it's supposed to be listening
              setTimeout(() => {
                try {
                  this.recognition?.start();
                  
                  // Set a timeout to stop recognition if it doesn't end naturally
                  this.recognitionTimeout = setTimeout(() => {
                    try {
                      this.recognition?.stop();
                    } catch (error) {
                      console.error("Error stopping timed out recognition:", error);
                    }
                  }, 10000); // 10 second timeout
                } catch (error) {
                  console.error("Error restarting speech recognition:", error);
                }
              }, 500);
            }
          };
        } catch (error) {
          console.error("Error initializing speech recognition:", error);
        }
      } else {
        console.warn("Speech recognition not supported in this browser");
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
    if (!this.synthesis) {
      console.warn("Speech synthesis not available");
      return;
    }
    
    // Cancel current speech if immediate
    if (immediate && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    
    try {
      // Create new utterance
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
      
      // Store current utterance for potential cancellation
      this.currentUtterance = utterance;
      
      // Speak the text
      console.log("Speaking:", text);
      this.synthesis.speak(utterance);
    } catch (error) {
      console.error("Error speaking text:", error);
    }
  }

  public startListening(): boolean {
    if (!this.recognition) {
      console.warn("Speech recognition not available");
      return false;
    }
    
    try {
      console.log("Starting speech recognition");
      this.recognition.start();
      this.isListening = true;
      
      // Set a timeout to stop recognition if it doesn't end naturally
      this.recognitionTimeout = setTimeout(() => {
        try {
          this.recognition?.stop();
        } catch (error) {
          console.error("Error stopping timed out recognition:", error);
        }
      }, 10000); // 10 second timeout
      
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  public stopListening(): void {
    if (!this.recognition) return;
    
    try {
      console.log("Stopping speech recognition");
      this.recognition.stop();
      this.isListening = false;
      
      // Clear timeout when manually stopping
      if (this.recognitionTimeout) {
        clearTimeout(this.recognitionTimeout);
        this.recognitionTimeout = null;
      }
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  public registerCommand(command: string, callback: (args?: string) => void): void {
    console.log(`Registering command: "${command}"`);
    this.commandCallbacks.set(command.toLowerCase(), callback);
  }

  public unregisterCommand(command: string): void {
    console.log(`Unregistering command: "${command}"`);
    this.commandCallbacks.delete(command.toLowerCase());
  }

  private processCommand(transcript: string): void {
    console.log('Processing voice command:', transcript);
    
    // Check for exact command matches
    for (const [command, callback] of this.commandCallbacks.entries()) {
      if (transcript === command) {
        console.log(`Executing exact command: "${command}"`);
        callback();
        return;
      }
    }
    
    // Check for commands with arguments
    for (const [command, callback] of this.commandCallbacks.entries()) {
      if (command !== '*' && transcript.startsWith(command + ' ')) {
        const args = transcript.substring(command.length).trim();
        console.log(`Executing command with args: "${command}" with args "${args}"`);
        callback(args);
        return;
      }
    }
    
    // Check for commands contained within the transcript
    for (const [command, callback] of this.commandCallbacks.entries()) {
      if (command === '*') {
        console.log(`Executing wildcard command with transcript: "${transcript}"`);
        callback(transcript);
        return;
      }
      
      if (transcript.includes(command)) {
        console.log(`Executing partial match command: "${command}"`);
        callback();
        return;
      }
    }
    
    // No command matched
    console.log("No command matched for transcript:", transcript);
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
  console.log("Setting up navigation voice commands");
  
  voiceAssistant.registerCommand('go to map', () => {
    console.log("Voice command: go to map");
    navigate('/');
  });
  
  voiceAssistant.registerCommand('show map', () => {
    console.log("Voice command: show map");
    navigate('/');
  });
  
  voiceAssistant.registerCommand('go to profile', () => {
    console.log("Voice command: go to profile");
    navigate('/profile');
  });
  
  voiceAssistant.registerCommand('show profile', () => {
    console.log("Voice command: show profile");
    navigate('/profile');
  });
  
  voiceAssistant.registerCommand('add place', () => {
    console.log("Voice command: add place");
    navigate('/add-place');
  });
  
  voiceAssistant.registerCommand('search', (query) => {
    console.log(`Voice command: search for "${query}"`);
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      voiceAssistant.speak('What would you like to search for?');
    }
  });
  
  voiceAssistant.registerCommand('find', (query) => {
    console.log(`Voice command: find "${query}"`);
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      voiceAssistant.speak('What would you like to find?');
    }
  });
  
  voiceAssistant.registerCommand('navigate to', (destination) => {
    console.log(`Voice command: navigate to "${destination}"`);
    if (destination) {
      navigate(`/search?q=${encodeURIComponent(destination)}`);
      voiceAssistant.speak(`Searching for ${destination}`);
    } else {
      voiceAssistant.speak('Where would you like to navigate to?');
    }
  });
  
  voiceAssistant.registerCommand('go back', () => {
    console.log("Voice command: go back");
    window.history.back();
  });
  
  voiceAssistant.registerCommand('help', () => {
    console.log("Voice command: help");
    voiceAssistant.speak(
      'Available commands: go to map, go to profile, add place, search, find, navigate to, go back, help'
    );
  });
}