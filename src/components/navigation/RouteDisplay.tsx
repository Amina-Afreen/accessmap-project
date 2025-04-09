import { useState, useEffect } from "react";
import { 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  MapPin, 
  Navigation, 
  Volume2, 
  VolumeX,
  Pause,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { VoiceAssistant } from "@/lib/voice-assistant";

interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
  isAccessible?: boolean;
}

interface RouteDisplayProps {
  origin: string;
  destination: string;
  totalDistance: string;
  totalDuration: string;
  steps: RouteStep[];
  onStartNavigation?: () => void;
  isNavigating?: boolean;
  onToggleNavigation?: () => void;
}

export function RouteDisplay({
  origin,
  destination,
  totalDistance,
  totalDuration,
  steps,
  onStartNavigation,
  isNavigating = false,
  onToggleNavigation,
}: RouteDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const voiceAssistant = VoiceAssistant.getInstance();
  
  // Speak the current step when it changes
  useEffect(() => {
    if (isNavigating && currentStep >= 0 && currentStep < steps.length && voiceEnabled) {
      voiceAssistant.speak(steps[currentStep].instruction);
    }
  }, [currentStep, isNavigating, voiceEnabled, steps]);

  // Set up automatic progression through steps when navigating
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isNavigating && voiceEnabled) {
      // Announce start of navigation
      if (currentStep === 0) {
        voiceAssistant.speak(`Starting navigation to ${destination}. ${steps[0].instruction}`);
      }
      
      // Set timer to advance to next step
      timer = setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          // Announce arrival
          voiceAssistant.speak(`You have arrived at your destination: ${destination}`);
        }
      }, 10000); // Advance every 10 seconds for demo purposes
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isNavigating, currentStep, voiceEnabled, destination, steps]);

  // Toggle voice guidance
  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    
    if (newState) {
      voiceAssistant.speak("Voice guidance enabled");
    } else {
      voiceAssistant.speak("Voice guidance disabled");
      voiceAssistant.cancelSpeech();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Route Overview</h3>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {totalDuration}
                <span className="mx-2">•</span>
                {totalDistance}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleVoice}
                className={voiceEnabled ? "text-blue-500" : ""}
              >
                {voiceEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              
              {isNavigating && onToggleNavigation && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onToggleNavigation}
                >
                  {isNavigating ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 mr-2 text-blue-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium">From</div>
                <div className="text-sm text-muted-foreground">{origin}</div>
              </div>
            </div>
            
            <div className="flex items-start">
              <MapPin className="h-5 w-5 mr-2 text-red-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium">To</div>
                <div className="text-sm text-muted-foreground">{destination}</div>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Turn-by-turn directions</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setExpanded(!expanded)}
                className="h-8 px-2"
              >
                {expanded ? (
                  <>
                    <span className="mr-1 text-sm">Less</span>
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span className="mr-1 text-sm">More</span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            
            <div className="space-y-3">
              {steps.slice(0, expanded ? undefined : 3).map((step, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-start p-2 rounded-md transition-colors",
                    currentStep === index ? "bg-blue-50 dark:bg-blue-900/20" : "",
                    isNavigating && currentStep === index ? "animate-pulse" : ""
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3",
                    currentStep === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm">{step.instruction}</p>
                    
                    <div className="flex items-center mt-1 text-xs text-muted-foreground">
                      <span>{step.distance}</span>
                      <span className="mx-1">•</span>
                      <span>{step.duration}</span>
                      
                      {step.isAccessible !== undefined && (
                        <>
                          <span className="mx-1">•</span>
                          <Badge 
                            variant={step.isAccessible ? "default" : "destructive"}
                            className="text-xs h-5"
                          >
                            {step.isAccessible ? "Accessible" : "Limited Access"}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {!expanded && steps.length > 3 && (
                <div className="text-center text-sm text-muted-foreground">
                  + {steps.length - 3} more steps
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {onStartNavigation && !isNavigating && (
        <Button 
          className="w-full"
          onClick={() => {
            onStartNavigation();
            voiceAssistant.speak(`Starting navigation to ${destination}`);
          }}
        >
          <Navigation className="h-4 w-4 mr-2" />
          Start Navigation
        </Button>
      )}
    </div>
  );
}