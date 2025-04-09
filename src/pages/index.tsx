import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fine } from "@/lib/fine";
import { Map } from "@/components/map/Map";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { NearbyPlaces } from "@/components/places/NearbyPlaces";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import { Schema } from "@/lib/db-types";
import { toast } from "sonner";
import { Place, fetchAccessiblePlaces } from "@/lib/overpass-api";
import { VoiceAssistant } from "@/lib/voice-assistant";
import { setupNavigationVoiceCommands } from "@/lib/voice-assistant";
import { SearchBar } from "@/components/search/SearchBar";

const Index = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [showNearby, setShowNearby] = useState(false);
  const navigate = useNavigate();
  const voiceAssistant = VoiceAssistant.getInstance();

  useEffect(() => {
    // Set up voice commands
    setupNavigationVoiceCommands(voiceAssistant, navigate);
    
    // Welcome message
    voiceAssistant.speak("Welcome to AccessMap. Your accessible navigation assistant.");
    
    // Get user location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        
        // Fetch places from Overpass API
        fetchNearbyPlaces(latitude, longitude);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Could not access your location");
        voiceAssistant.speak("Could not access your location. Some features may be limited.");
        
        // Fallback to database
        fetchPlacesFromDatabase();
      }
    );
  }, []);

  const fetchNearbyPlaces = async (latitude: number, longitude: number) => {
    try {
      const fetchedPlaces = await fetchAccessiblePlaces(latitude, longitude, 2000);
      if (fetchedPlaces && fetchedPlaces.length > 0) {
        setPlaces(fetchedPlaces);
        voiceAssistant.speak(`Found ${fetchedPlaces.length} accessible places nearby.`);
      } else {
        // Fallback to database
        fetchPlacesFromDatabase();
      }
    } catch (error) {
      console.error("Error fetching places from Overpass API:", error);
      // Fallback to database
      fetchPlacesFromDatabase();
    }
  };

  const fetchPlacesFromDatabase = async () => {
    try {
      const fetchedPlaces = await fine.table("places").select();
      if (fetchedPlaces && fetchedPlaces.length > 0) {
        // Convert database places to Place format
        const formattedPlaces = fetchedPlaces.map(place => ({
          id: place.id!,
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          address: place.address,
          placeType: place.placeType,
          accessibilityFeatures: typeof place.accessibilityFeatures === 'string' 
            ? JSON.parse(place.accessibilityFeatures) 
            : place.accessibilityFeatures,
          phone: place.phone || undefined,
          website: place.website || undefined,
          rating: place.rating || undefined
        }));
        
        setPlaces(formattedPlaces);
      }
    } catch (error) {
      console.error("Error fetching places from database:", error);
    }
  };

  const handleMarkerClick = (id: number) => {
    navigate(`/place-details/${id}`);
  };

  const toggleNearby = () => {
    setShowNearby(!showNearby);
    
    if (!showNearby) {
      voiceAssistant.speak("Showing nearby places");
    }
  };

  const handlePlacesLoaded = (loadedPlaces: Place[]) => {
    setPlaces(loadedPlaces);
  };

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <main className="flex-1 pt-14 pb-16 relative">
        {/* Fixed search bar at the top */}
        <div className="absolute top-16 left-0 right-0 z-10 px-4 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <SearchBar 
            expanded={true}
            onSearch={handleSearch}
            placeholder="Search for accessible places..."
          />
        </div>
        
        <Map
          center={userLocation || undefined}
          markers={places.map(place => ({
            id: place.id!,
            position: [place.lat, place.lng],
            title: place.name,
            type: place.placeType
          }))}
          onMarkerClick={handleMarkerClick}
          showUserLocation={true}
          onPlacesLoaded={handlePlacesLoaded}
        />
        
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <Button 
            variant="default" 
            className="shadow-lg"
            onClick={() => navigate("/search")}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          
          <Button 
            variant={showNearby ? "secondary" : "default"}
            className="shadow-lg"
            onClick={toggleNearby}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Nearby
          </Button>
        </div>
        
        {showNearby && (
          <div className="absolute bottom-16 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-xl shadow-lg max-h-[60vh] overflow-y-auto">
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4">Nearby Places</h2>
              <NearbyPlaces userLocation={userLocation || undefined} places={places} />
            </div>
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Index;