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
  const [isLoading, setIsLoading] = useState(true);
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
        toast.error("Could not access your location. Please check your location permissions.");
        voiceAssistant.speak("Could not access your location. Some features may be limited.");
        
        // Fallback to database
        fetchPlacesFromDatabase();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  const fetchNearbyPlaces = async (latitude: number, longitude: number) => {
    try {
      setIsLoading(true);
      console.log(`Fetching nearby places at [${latitude}, ${longitude}]`);
      const fetchedPlaces = await fetchAccessiblePlaces(latitude, longitude, 2000);
      
      if (fetchedPlaces && fetchedPlaces.length > 0) {
        console.log(`Found ${fetchedPlaces.length} places from Overpass API`);
        
        // Calculate distance for each place
        const placesWithDistance = fetchedPlaces.map(place => {
          const distance = calculateDistance(
            latitude,
            longitude,
            place.lat,
            place.lng
          );
          
          return {
            ...place,
            distance,
            distanceText: `${distance.toFixed(1)} km away`
          };
        }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        
        setPlaces(placesWithDistance);
        voiceAssistant.speak(`Found ${placesWithDistance.length} accessible places nearby.`);
      } else {
        console.log("No places found from Overpass API, falling back to database");
        // Fallback to database
        fetchPlacesFromDatabase();
      }
    } catch (error) {
      console.error("Error fetching places from Overpass API:", error);
      // Fallback to database
      fetchPlacesFromDatabase();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlacesFromDatabase = async () => {
    try {
      setIsLoading(true);
      const fetchedPlaces = await fine.table("places").select();
      
      if (fetchedPlaces && fetchedPlaces.length > 0) {
        console.log(`Found ${fetchedPlaces.length} places from database`);
        
        // Convert database places to Place format
        const formattedPlaces = fetchedPlaces.map(place => {
          // Calculate distance if user location is available
          let distance = undefined;
          let distanceText = undefined;
          
          if (userLocation) {
            distance = calculateDistance(
              userLocation[0],
              userLocation[1],
              place.lat,
              place.lng
            );
            distanceText = `${distance.toFixed(1)} km away`;
          }
          
          return {
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
            rating: place.rating || undefined,
            distance,
            distanceText
          };
        }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        
        setPlaces(formattedPlaces);
        voiceAssistant.speak(`Found ${formattedPlaces.length} accessible places.`);
      } else {
        toast.error("No places found. Please try a different location.");
        voiceAssistant.speak("No accessible places found.");
      }
    } catch (error) {
      console.error("Error fetching places from database:", error);
      toast.error("Error loading places");
    } finally {
      setIsLoading(false);
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
    if (loadedPlaces.length > 0) {
      console.log(`Received ${loadedPlaces.length} places from Map component`);
      
      // Calculate distance if user location is available
      if (userLocation) {
        const placesWithDistance = loadedPlaces.map(place => {
          const distance = calculateDistance(
            userLocation[0],
            userLocation[1],
            place.lat,
            place.lng
          );
          
          return {
            ...place,
            distance,
            distanceText: `${distance.toFixed(1)} km away`
          };
        }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        
        setPlaces(placesWithDistance);
      } else {
        setPlaces(loadedPlaces);
      }
    }
  };

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleLocationFound = (location: [number, number]) => {
    console.log(`Location found: [${location[0]}, ${location[1]}]`);
    setUserLocation(location);
    
    // Update distances for places
    if (places.length > 0) {
      const updatedPlaces = places.map(place => {
        const distance = calculateDistance(
          location[0],
          location[1],
          place.lat,
          place.lng
        );
        
        return {
          ...place,
          distance,
          distanceText: `${distance.toFixed(1)} km away`
        };
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      setPlaces(updatedPlaces);
    }
  };

  // Calculate distance between two points in km using Haversine formula
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
  
  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
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
          onLocationFound={handleLocationFound}
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
              <NearbyPlaces 
                userLocation={userLocation || undefined} 
                places={places}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Index;