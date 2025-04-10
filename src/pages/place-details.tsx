import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fine } from "@/lib/fine";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { AccessibilityFeatures } from "@/components/places/AccessibilityFeatures";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  MessageSquare, 
  AlertTriangle,
  Navigation2,
  Loader2
} from "lucide-react";
import { Schema } from "@/lib/db-types";
import { toast } from "sonner";
import { VoiceAssistant } from "@/lib/voice-assistant";

const PlaceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<Schema["places"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const navigate = useNavigate();
  const voiceAssistant = VoiceAssistant.getInstance();

  useEffect(() => {
    // Get user location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Could not access your location. Some navigation features may be limited.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Fetch place details
    const fetchPlaceDetails = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        console.log(`Fetching place details for ID: ${id}`);
        const place = await fine.table("places").select().eq("id", parseInt(id));
        
        if (place && place.length > 0) {
          console.log("Place details found:", place[0]);
          setPlace(place[0]);
          
          // Announce place details
          const accessibilityFeatures = JSON.parse(place[0].accessibilityFeatures || '[]');
          voiceAssistant.speak(
            `${place[0].name}. ${accessibilityFeatures.length} accessibility features including ${accessibilityFeatures.slice(0, 3).join(', ')}`
          );
        } else {
          console.error("Place not found");
          toast.error("Place not found");
          voiceAssistant.speak("Place not found");
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
        toast.error("Failed to load place details");
        voiceAssistant.speak("Failed to load place details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaceDetails();
  }, [id, navigate]);

  const handleShowDirections = () => {
    if (!place || !userLocation) {
      toast.error("Unable to get your location. Please enable location services.");
      voiceAssistant.speak("Unable to get your location. Please enable location services.");
      return;
    }
    
    console.log(`Navigating to ${place.name} at [${place.lat}, ${place.lng}]`);
    voiceAssistant.speak(`Showing directions to ${place.name}`);
    navigate(`/navigation?from=${userLocation[0]},${userLocation[1]}&to=${place.lat},${place.lng}&name=${encodeURIComponent(place.name)}`);
  };

  const handleAddReview = () => {
    voiceAssistant.speak("Add review page");
    navigate(`/add-review/${id}`);
  };

  const handleReportProblem = () => {
    toast.info("Problem reporting feature coming soon");
    voiceAssistant.speak("Problem reporting feature coming soon");
  };

  const handleCall = () => {
    if (place?.phone) {
      voiceAssistant.speak(`Calling ${place.name}`);
      window.location.href = `tel:${place.phone}`;
    }
  };

  const handleVisitWebsite = () => {
    if (place?.website) {
      voiceAssistant.speak(`Opening website for ${place.name}`);
      window.open(place.website.startsWith('http') ? place.website : `https://${place.website}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="Place Details" showBackButton />
        <main className="flex-1 pt-14 pb-16 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Loading place details...</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="Place Details" showBackButton />
        <main className="flex-1 pt-14 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold">Place not found</h2>
            <p className="text-muted-foreground mt-2">The place you're looking for doesn't exist or has been removed.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Parse accessibility features
  const accessibilityFeatures = JSON.parse(place.accessibilityFeatures || '[]');

  return (
    <div className="flex flex-col h-screen">
      <Header title={place.name} showBackButton />
      
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <div className="text-green-600 dark:text-green-300">
                👍
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">{place.name}</h1>
              {place.rating && (
                <div className="flex items-center text-yellow-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="ml-1">{place.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
              <p className="text-sm">{place.address}</p>
            </div>
            
            {place.phone && (
              <div className="flex items-center">
                <Phone className="h-5 w-5 mr-2 text-gray-500" />
                <a 
                  href={`tel:${place.phone}`} 
                  className="text-sm text-blue-600 dark:text-blue-400"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCall();
                  }}
                >
                  {place.phone}
                </a>
              </div>
            )}
            
            {place.website && (
              <div className="flex items-center">
                <Globe className="h-5 w-5 mr-2 text-gray-500" />
                <a 
                  href={place.website.startsWith('http') ? place.website : `https://${place.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400"
                  onClick={(e) => {
                    e.preventDefault();
                    handleVisitWebsite();
                  }}
                >
                  {place.website}
                </a>
              </div>
            )}
            
            <div className="flex items-center">
              <div className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 rounded-full text-sm">
                {place.placeType.charAt(0).toUpperCase() + place.placeType.slice(1)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h2 className="text-lg font-semibold mb-3">Accessibility Features</h2>
            <AccessibilityFeatures features={accessibilityFeatures} />
          </div>
          
          <Button 
            className="w-full"
            onClick={handleShowDirections}
          >
            <Navigation2 className="h-4 w-4 mr-2" />
            Show Directions
          </Button>
          
          <Button 
            variant="outline"
            className="w-full"
            onClick={handleAddReview}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Review
          </Button>
          
          <div className="pt-4">
            <Button 
              variant="ghost"
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleReportProblem}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report A Problem
            </Button>
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default PlaceDetails;