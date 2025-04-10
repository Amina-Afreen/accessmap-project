import { useEffect, useState, useRef } from "react";
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
  const [locationError, setLocationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const voiceAssistant = VoiceAssistant.getInstance();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Set up voice commands
    setupNavigationVoiceCommands(voiceAssistant, navigate);
    
    // Welcome message
    voiceAssistant.speak("Welcome to AccessMap. Your accessible navigation assistant.");
    
    // Get user location with multiple attempts
    const getLocation = (attempt = 1) => {
      const maxAttempts = 3;
      
      // Request high accuracy location
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`Location found: [${latitude}, ${longitude}]`);
          setUserLocation([latitude, longitude]);
          
          // Fetch places from Overpass API
          fetchNearbyPlaces(latitude, longitude);
        },
        (error) => {
          console.error(`Error getting location (attempt ${attempt}/${maxAttempts}):`, error);
          
          if (attempt < maxAttempts) {
            // Retry with a delay
            setTimeout(() => getLocation(attempt + 1), 1000);
          } else {
            // All attempts failed
            setLocationError(`Could not access your location: ${error.message}`);
            toast.error("Could not access your location. Please check your location permissions.");
            voiceAssistant.speak("Could not access your location. Some features may be limited.");
            
            // Fallback to database or default location
            fetchPlacesFromDatabase();
          }
        },
        options
      );
    };
    
    // Start location detection
    getLocation();
    
    // Cleanup
    return () => {
      // Cancel any pending speech
      voiceAssistant.cancelSpeech();
      
      // Abort any pending API requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchNearbyPlaces = async (latitude: number, longitude: number) => {
    try {
      setIsLoading(true);
      
      // Cancel any previous requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      
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
    } catch (error: any) {
      console.error("Error fetching places from Overpass API:", error);
      
      // Only show error if it's not an abort error
      if (error.name !== 'AbortError') {
        // Fallback to database
        fetchPlacesFromDatabase();
      }
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
        // Use sample data if no places in database
        useSampleData();
      }
    } catch (error) {
      console.error("Error fetching places from database:", error);
      toast.error("Error loading places");
      
      // Use sample data as last resort
      useSampleData();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Use sample data when all else fails
  const useSampleData = () => {
    console.log("Using sample place data");
    
    // Generate some sample places
    const samplePlaces: Place[] = [
      {
        id: 1001,
        name: "Loyola Academy",
        lat: 13.0412,
        lng: 80.2339,
        address: "Near Kishkintha, Raja Gopala Kandigai, Tharkas (Post) Erumaiyur, West Tambaram, Chennai - 600 044.",
        placeType: "education",
        accessibilityFeatures: ["Ramp", "Automatic Doors", "Handrails"],
        phone: "+919145604423",
        website: "www.loyola.edu.in",
        rating: 4.5,
        distanceText: "1.2 km away"
      },
      {
        id: 1002,
        name: "Bistrograph",
        lat: 13.0382,
        lng: 80.2321,
        address: "Shastri Nagar, Adyar, Chennai, Tamil Nadu",
        placeType: "restaurant",
        accessibilityFeatures: ["Accessible Washroom", "Ramp"],
        phone: "+919876543210",
        website: "www.bistrograph.com",
        rating: 4.2,
        distanceText: "0.8 km away"
      },
      {
        id: 1003,
        name: "Nirmal Eye Hospital",
        lat: 13.0501,
        lng: 80.2183,
        address: "Gandhi Road, Tambaram, Chennai, Tamil Nadu",
        placeType: "hospital",
        accessibilityFeatures: ["Elevator", "Wheelchair Access"],
        phone: "+919123456789",
        website: "www.nirmaleyehospital.com",
        rating: 4.0,
        distanceText: "1.5 km away"
      },
      {
        id: 1004,
        name: "Hindu Mission Hospital",
        lat: 13.0456,
        lng: 80.2167,
        address: "Tambaram, Chennai, Tamil Nadu",
        placeType: "hospital",
        accessibilityFeatures: ["Elevator", "Ramp", "Accessible Washroom"],
        phone: "+919234567890",
        website: "www.hindumissionhospital.org",
        rating: 4.3,
        distanceText: "1.7 km away"
      },
      {
        id: 1005,
        name: "Tambaram Railway Station",
        lat: 13.0478,
        lng: 80.2198,
        address: "Tambaram, Chennai, Tamil Nadu",
        placeType: "transport",
        accessibilityFeatures: ["Ramp", "Handrails"],
        rating: 3.8,
        distanceText: "0.9 km away"
      }
    ];
    
    setPlaces(samplePlaces);
    voiceAssistant.speak(`Found ${samplePlaces.length} accessible places nearby.`);
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
        
        {locationError && (
          <div className="absolute top-28 left-0 right-0 mx-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-2 rounded-md text-sm">
            {locationError}
            <Button 
              variant="link" 
              size="sm" 
              className="ml-2 p-0 h-auto text-red-600 dark:text-red-300"
              onClick={() => {
                // Retry location detection
                setLocationError(null);
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation([latitude, longitude]);
                    fetchNearbyPlaces(latitude, longitude);
                  },
                  (error) => {
                    setLocationError(`Could not access your location: ${error.message}`);
                    toast.error("Could not access your location. Using default location.");
                  }
                );
              }}
            >
              Retry
            </Button>
          </div>
        )}
        
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