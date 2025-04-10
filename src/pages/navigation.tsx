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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeGenerationAttempts, setRouteGenerationAttempts] = useState(0);
  
  const voiceAssistant = VoiceAssistant.getInstance();

  useEffect(() => {
    // Parse from and to coordinates from URL
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const nameParam = searchParams.get("name");
    
    if (fromParam && toParam) {
      try {
        const [fromLat, fromLng] = fromParam.split(",").map(Number);
        const [toLat, toLng] = toParam.split(",").map(Number);
        
        if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
          throw new Error("Invalid coordinates");
        }
        
        setOrigin([fromLat, fromLng]);
        setDestination([toLat, toLng]);
        
        if (nameParam) {
          setDestinationName(decodeURIComponent(nameParam));
        }
        
        // Generate route using A* algorithm
        generateRoute(fromLat, fromLng, toLat, toLng);
      } catch (error) {
        console.error("Error parsing route parameters:", error);
        setRouteError("Invalid route parameters");
        toast.error("Invalid route parameters");
        voiceAssistant.speak("Invalid route parameters. Please try again.");
      }
    } else {
      setRouteError("Missing route parameters");
      toast.error("Missing route parameters");
      voiceAssistant.speak("Missing route parameters. Returning to map.");
      setTimeout(() => navigate("/"), 3000);
    }
    
    // Start watching user location for real-time navigation
    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Error watching location:", error);
          toast.error("Could not access your location for navigation");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
      
      setLocationWatchId(watchId);
    } catch (error) {
      console.error("Error setting up location watching:", error);
    }
    
    // Cleanup
    return () => {
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
    };
  }, [searchParams, navigate]);

  const generateRoute = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    try {
      setIsLoading(true);
      setRouteError(null);
      voiceAssistant.speak("Generating accessible route...");
      
      // Get user preferences from database
      const { data: session } = fine.auth.useSession();
      let routeProfile = "wheelchair"; // Default profile
      
      if (session?.user?.id) {
        try {
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
        } catch (error) {
          console.error("Error fetching user preferences:", error);
          // Continue with default profile
        }
      }
      
      console.log(`Generating route with profile: ${routeProfile}`);
      
      // Add timeout to prevent hanging requests
      const routePromise = fetchRoute(startLat, startLng, endLat, endLng, routeProfile);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Route generation timed out")), 15000);
      });
      
      // Race between route generation and timeout
      const routeData = await Promise.race([routePromise, timeoutPromise]) as Awaited<ReturnType<typeof fetchRoute>>;
      
      setRoute(routeData.route);
      setRouteDetails({
        distance: routeData.distance,
        duration: routeData.duration,
        steps: routeData.steps
      });
      
      voiceAssistant.speak("Route generated successfully.");
    } catch (error) {
      console.error("Error generating route:", error);
      setRouteError(`Failed to generate route: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Failed to generate route");
      voiceAssistant.speak("Failed to generate route. Using simplified route instead.");
      
      // Generate a simple direct route as fallback
      generateFallbackRoute(startLat, startLng, endLat, endLng);
      
      // Increment attempt counter
      setRouteGenerationAttempts(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate a simple direct route when the main route generation fails
  const generateFallbackRoute = (startLat: number, startLng: number, endLat: number, endLng: number) => {
    try {
      // Create a simple straight line route
      const route: Array<[number, number]> = [];
      const steps = 10;
      
      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        const lat = startLat + (endLat - startLat) * ratio;
        const lng = startLng + (endLng - startLng) * ratio;
        route.push([lat, lng]);
      }
      
      setRoute(route);
      
      // Calculate distance using Haversine formula
      const R = 6371e3; // Earth's radius in meters
      const φ1 = startLat * Math.PI / 180;
      const φ2 = endLat * Math.PI / 180;
      const Δφ = (endLat - startLat) * Math.PI / 180;
      const Δλ = (endLng - startLng) * Math.PI / 180;
      
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      // Estimate duration (walking speed ~1.4 m/s)
      const duration = distance / 1.4;
      
      setRouteDetails({
        distance,
        duration,
        steps: [
          {
            instruction: "Head toward your destination",
            distance: formatDistance(distance),
            duration: formatDuration(duration),
            isAccessible: true
          },
          {
            instruction: "Arrive at your destination",
            distance: "0 m",
            duration: "0 min",
            isAccessible: true
          }
        ]
      });
      
      toast.info("Using simplified route");
      voiceAssistant.speak("Using simplified route. Some accessibility features may not be available.");
    } catch (error) {
      console.error("Error generating fallback route:", error);
      setRouteError("Could not generate any route. Please try again.");
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

  // Check if user is near a waypoint
  useEffect(() => {
    if (!isNavigating || !userLocation || !route.length) return;
    
    // Check distance to next waypoint
    const nextWaypointIndex = Math.min(currentStep + 1, route.length - 1);
    const nextWaypoint = route[nextWaypointIndex];
    
    const distance = calculateDistance(
      userLocation[0],
      userLocation[1],
      nextWaypoint[0],
      nextWaypoint[1]
    );
    
    // If within 20 meters of next waypoint, advance to next step
    if (distance < 0.02) {
      if (currentStep < (routeDetails?.steps.length || 0) - 1) {
        setCurrentStep(currentStep + 1);
        
        // Announce next instruction
        if (routeDetails?.steps[currentStep + 1]) {
          voiceAssistant.speak(routeDetails.steps[currentStep + 1].instruction);
        }
      }
    }
  }, [userLocation, isNavigating, route]);

  // Calculate distance between two points in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };
  
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  // Retry route generation
  const handleRetryRoute = () => {
    if (origin && destination) {
      generateRoute(origin[0], origin[1], destination[0], destination[1]);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Navigation" showBackButton showSearch={false} />
      
      <main className="flex-1 pt-14 pb-0 relative">
        <Map
          center={userLocation || origin || undefined}
          route={route}
          showUserLocation={true}
        />
        
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-xl shadow-lg max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Generating accessible route...</span>
            </div>
          ) : routeError && routeGenerationAttempts > 1 ? (
            <div className="p-4 space-y-4">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded-md">
                <h3 className="font-medium">Error generating route</h3>
                <p className="text-sm mt-1">{routeError}</p>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate("/")}
                >
                  Return to Map
                </Button>
                
                <Button 
                  className="flex-1"
                  onClick={handleRetryRoute}
                >
                  Retry
                </Button>
              </div>
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