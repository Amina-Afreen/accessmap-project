import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Map } from "@/components/map/Map";
import { Header } from "@/components/layout/Header";
import { RouteDisplay } from "@/components/navigation/RouteDisplay";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { fetchRoute } from "@/lib/overpass-api";
import { VoiceAssistant } from "@/lib/voice-assistant";
import { fine } from "@/lib/fine";

const Navigation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destinationName, setDestinationName] = useState("");
  const [route, setRoute] = useState<Array<[number, number]>>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [routeDetails, setRouteDetails] = useState<{
    distance: number;
    duration: number;
    steps: Array<{
      instruction: string;
      distance: string;
      duration: string;
      isAccessible: boolean;
    }>;
  } | null>(null);
  
  const voiceAssistant = VoiceAssistant.getInstance();

  useEffect(() => {
    // Parse from and to coordinates from URL
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const nameParam = searchParams.get("name");
    
    if (fromParam && toParam) {
      const [fromLat, fromLng] = fromParam.split(",").map(Number);
      const [toLat, toLng] = toParam.split(",").map(Number);
      
      setOrigin([fromLat, fromLng]);
      setDestination([toLat, toLng]);
      
      if (nameParam) {
        setDestinationName(decodeURIComponent(nameParam));
      }
      
      // Generate route using A* algorithm
      generateRoute(fromLat, fromLng, toLat, toLng);
    } else {
      toast.error("Missing route parameters");
      voiceAssistant.speak("Missing route parameters. Returning to map.");
      navigate("/");
    }
  }, [searchParams, navigate]);

  const generateRoute = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    try {
      setIsLoading(true);
      voiceAssistant.speak("Generating accessible route...");
      
      // Get user preferences from database
      const { data: session } = fine.auth.useSession();
      let routeProfile = "wheelchair"; // Default profile
      
      if (session?.user?.id) {
        const userPrefs = await fine.table("userPreferences").select().eq("userId", session.user.id);
        if (userPrefs && userPrefs.length > 0) {
          const prefs = userPrefs[0];
          
          // Adjust route profile based on user preferences
          if (prefs.mobilityAid) {
            routeProfile = "wheelchair";
          } else if (prefs.visualNeeds) {
            routeProfile = "foot-with-visual-aids";
          } else if (prefs.preferredRouteType === "mostAccessible") {
            routeProfile = "accessible";
          } else if (prefs.preferredRouteType === "fewestSteps") {
            routeProfile = "foot-no-steps";
          }
        }
      }
      
      // Fetch route data
      const routeData = await fetchRoute(startLat, startLng, endLat, endLng, routeProfile);
      
      setRoute(routeData.route);
      setRouteDetails({
        distance: routeData.distance,
        duration: routeData.duration,
        steps: routeData.steps
      });
      
      voiceAssistant.speak("Route generated successfully.");
    } catch (error) {
      console.error("Error generating route:", error);
      toast.error("Failed to generate route");
      voiceAssistant.speak("Failed to generate route. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startNavigation = () => {
    setIsNavigating(true);
    setCurrentStep(0);
    
    // Announce start of navigation
    voiceAssistant.speak(`Starting navigation to ${destinationName}. ${routeDetails?.steps[0].instruction}`);
    
    // Simulate navigation progress
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= (routeDetails?.steps.length || 0) - 1) {
          clearInterval(interval);
          toast.success("You have arrived at your destination!");
          voiceAssistant.speak(`You have arrived at your destination: ${destinationName}`);
          return prev;
        }
        return prev + 1;
      });
    }, 10000); // Advance to next step every 10 seconds for demo
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  };

  const toggleNavigation = () => {
    setIsNavigating(!isNavigating);
    
    if (isNavigating) {
      voiceAssistant.speak("Navigation paused");
    } else {
      voiceAssistant.speak("Navigation resumed");
    }
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours} hr ${remainingMinutes} min`;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Navigation" showBackButton showSearch={false} />
      
      <main className="flex-1 pt-14 pb-0 relative">
        <Map
          center={origin || undefined}
          route={route}
          showUserLocation={true}
        />
        
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-xl shadow-lg max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Generating accessible route...</span>
            </div>
          ) : isNavigating ? (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">
                    {currentStep < (routeDetails?.steps.length || 0) ? 
                      routeDetails?.steps[currentStep].instruction : 
                      "You have arrived"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {currentStep < (routeDetails?.steps.length || 0) - 1 ? 
                      `Next: ${routeDetails?.steps[currentStep + 1].instruction}` : 
                      "Destination reached"}
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={toggleNavigation}
                >
                  {isNavigating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="flex justify-between text-sm">
                <div>
                  <div className="font-medium">Distance remaining</div>
                  <div>
                    {routeDetails ? formatDistance(
                      routeDetails.distance * (1 - currentStep / (routeDetails.steps.length - 1))
                    ) : "N/A"}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium">Time remaining</div>
                  <div>
                    {routeDetails ? formatDuration(
                      routeDetails.duration * (1 - currentStep / (routeDetails.steps.length - 1))
                    ) : "N/A"}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium">Arrival</div>
                  <div>
                    {(() => {
                      if (!routeDetails) return "N/A";
                      const now = new Date();
                      const remainingSeconds = routeDetails.duration * (1 - currentStep / (routeDetails.steps.length - 1));
                      const arrivalTime = new Date(now.getTime() + remainingSeconds * 1000);
                      return arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    })()}
                  </div>
                </div>
              </div>
              
              <Button 
                variant="ghost"
                className="w-full"
                onClick={() => {
                  voiceAssistant.speak("Exiting navigation");
                  navigate("/");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Navigation
              </Button>
            </div>
          ) : (
            <div className="p-4">
              {routeDetails && (
                <RouteDisplay
                  origin="Current Location"
                  destination={destinationName || "Destination"}
                  totalDistance={formatDistance(routeDetails.distance)}
                  totalDuration={formatDuration(routeDetails.duration)}
                  steps={routeDetails.steps}
                  onStartNavigation={startNavigation}
                  isNavigating={isNavigating}
                  onToggleNavigation={toggleNavigation}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Navigation;