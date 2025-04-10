import { useEffect, useState } from "react";
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
  const voiceAssistant = VoiceAssistant.getInstance();

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
        
        if (userLocation) {
          console.log(`NearbyPlaces: Fetching places near [${userLocation[0]}, ${userLocation[1]}]`);
          // Fetch places from Overpass API
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
            const dbPlaces = await fine.table("places").select();
            
            if (dbPlaces && dbPlaces.length > 0) {
              console.log(`NearbyPlaces: Found ${dbPlaces.length} places from database`);
              // Calculate distance for each place
              const placesWithDistance = dbPlaces.map(place => {
                const distance = calculateDistance(
                  userLocation[0],
                  userLocation[1],
                  place.lat,
                  place.lng
                );
                
                // Convert database place to Place format
                const accessibilityFeatures = typeof place.accessibilityFeatures === 'string' 
                  ? JSON.parse(place.accessibilityFeatures) 
                  : place.accessibilityFeatures;
                
                return {
                  id: place.id!,
                  name: place.name,
                  lat: place.lat,
                  lng: place.lng,
                  address: place.address,
                  placeType: place.placeType,
                  accessibilityFeatures,
                  phone: place.phone || undefined,
                  website: place.website || undefined,
                  rating: place.rating || undefined,
                  distance,
                  distanceText: `${distance.toFixed(1)} km away`
                } as Place;
              }).filter(place => place.distance <= maxDistance)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, limit);
              
              setPlaces(placesWithDistance);
              setFilteredPlaces(placesWithDistance);
            }
          }
        } else {
          console.log("NearbyPlaces: No user location, fetching from database");
          // If no user location, just fetch from database
          const dbPlaces = await fine.table("places").select();
          
          if (dbPlaces && dbPlaces.length > 0) {
            console.log(`NearbyPlaces: Found ${dbPlaces.length} places from database`);
            // Convert database places to Place format
            const formattedPlaces = dbPlaces.map(place => {
              const accessibilityFeatures = typeof place.accessibilityFeatures === 'string' 
                ? JSON.parse(place.accessibilityFeatures) 
                : place.accessibilityFeatures;
              
              return {
                id: place.id!,
                name: place.name,
                lat: place.lat,
                lng: place.lng,
                address: place.address,
                placeType: place.placeType,
                accessibilityFeatures,
                phone: place.phone || undefined,
                website: place.website || undefined,
                rating: place.rating || undefined
              } as Place;
            }).slice(0, limit);
            
            setPlaces(formattedPlaces);
            setFilteredPlaces(formattedPlaces);
          }
        }
      } catch (error) {
        console.error("Error fetching nearby places:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNearbyPlaces();
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
  
  // Calculate distance between two coordinates in km
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
          No places found nearby
        </div>
      )}
    </div>
  );
}