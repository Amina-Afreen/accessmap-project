import { useEffect, useState, useRef } from "react";
import { fine } from "@/lib/fine";
import { PlaceCard } from "./PlaceCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Schema } from "@/lib/db-types";
import { fetchAccessiblePlaces, Place } from "@/lib/overpass-api";
import { VoiceAssistant } from "@/lib/voice-assistant";

interface NearbyPlacesProps {
  userLocation?: [number, number];
  maxDistance?: number; // in km
  limit?: number;
  places?: Place[];
  isLoading?: boolean;
}

export function NearbyPlaces({
  userLocation,
  maxDistance = 5,
  limit = 10,
  places: initialPlaces,
  isLoading: externalLoading = false,
}: NearbyPlacesProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const voiceAssistant = VoiceAssistant.getInstance();
  const loadAttempts = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // If places are provided as props, use them
    if (initialPlaces && initialPlaces.length > 0) {
      console.log(`NearbyPlaces: Received ${initialPlaces.length} places from props`);
      setPlaces(initialPlaces);
      setFilteredPlaces(initialPlaces);
      setIsLoading(false);
      return;
    }

    const fetchNearbyPlaces = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        // Cancel any previous requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        // Create a new abort controller for this request
        abortControllerRef.current = new AbortController();
        
        if (userLocation) {
          console.log(`NearbyPlaces: Fetching places near [${userLocation[0]}, ${userLocation[1]}]`);
          
          // Fetch places with a longer timeout
          const fetchedPlaces = await fetchAccessiblePlaces(userLocation[0], userLocation[1], 2000);
          
          if (fetchedPlaces.length > 0) {
            console.log(`NearbyPlaces: Found ${fetchedPlaces.length} places from Overpass API`);
            // Calculate distance for each place
            const placesWithDistance = fetchedPlaces.map(place => {
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
            }).filter(place => place.distance <= maxDistance)
              .sort((a, b) => a.distance - b.distance)
              .slice(0, limit);
            
            setPlaces(placesWithDistance);
            setFilteredPlaces(placesWithDistance);
            
            // Announce places found
            voiceAssistant.speak(`Found ${placesWithDistance.length} nearby places`);
          } else {
            console.log("NearbyPlaces: No places found from Overpass API, falling back to database");
            // Fallback to database if no places found via Overpass
            fetchPlacesFromDatabase();
          }
        } else {
          console.log("NearbyPlaces: No user location, fetching from database");
          // If no user location, just fetch from database
          fetchPlacesFromDatabase();
        }
      } catch (error: any) {
        console.error("Error fetching places from Overpass API:", error);
        
        // Only show error if it's not an abort error
        if (error.name !== 'AbortError') {
          setLoadError("Failed to load nearby places");
          
          // Retry with fallback data if we've had multiple failures
          if (loadAttempts.current < 2) {
            loadAttempts.current++;
            // Fallback to database
            fetchPlacesFromDatabase();
          } else {
            // Use sample data as last resort
            useSampleData();
          }
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
          console.log(`NearbyPlaces: Found ${fetchedPlaces.length} places from database`);
          
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
          }).sort((a, b) => (a.distance || 0) - (b.distance || 0))
            .slice(0, limit);
          
          setPlaces(formattedPlaces);
          setFilteredPlaces(formattedPlaces);
          voiceAssistant.speak(`Found ${formattedPlaces.length} accessible places.`);
        } else {
          // If no places in database, use sample data
          useSampleData();
        }
      } catch (error) {
        console.error("Error fetching places from database:", error);
        // Use sample data as last resort
        useSampleData();
      } finally {
        setIsLoading(false);
      }
    };
    
    const useSampleData = () => {
      console.log("NearbyPlaces: Using sample data");
      
      // Sample places data
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
      setFilteredPlaces(samplePlaces);
      voiceAssistant.speak(`Found ${samplePlaces.length} accessible places nearby.`);
    };
    
    fetchNearbyPlaces();
    
    // Cleanup function to abort any pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userLocation, initialPlaces]);
  
  // Filter places when tab changes
  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredPlaces(places);
    } else {
      setFilteredPlaces(
        places.filter(place => place.placeType === activeFilter)
      );
    }
  }, [activeFilter, places]);
  
  // Calculate distance between two points in km using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
    <div className="space-y-4">
      <Tabs defaultValue="all" onValueChange={setActiveFilter}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="restaurant">Restaurants</TabsTrigger>
          <TabsTrigger value="hospital">Hospitals</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="shopping">Shopping</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {isLoading || externalLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredPlaces.length > 0 ? (
        <div className="space-y-4">
          {filteredPlaces.map((place) => {
            // Parse accessibility features if it's a string
            const accessibilityFeatures = typeof place.accessibilityFeatures === 'string' 
              ? JSON.parse(place.accessibilityFeatures) 
              : place.accessibilityFeatures;
              
            return (
              <PlaceCard
                key={place.id}
                id={place.id!}
                name={place.name}
                address={place.address}
                accessibilityFeatures={accessibilityFeatures}
                rating={place.rating || undefined}
                placeType={place.placeType}
                distance={(place as any).distanceText}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {loadError ? loadError : "No places found nearby"}
        </div>
      )}
    </div>
  );
}