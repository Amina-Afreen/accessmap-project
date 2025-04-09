import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fine } from "@/lib/fine";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { PlaceCard } from "@/components/places/PlaceCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search as SearchIcon, Filter, Mic } from "lucide-react";
import { Schema } from "@/lib/db-types";
import { searchPlaces, Place } from "@/lib/overpass-api";
import { VoiceAssistant } from "@/lib/voice-assistant";
import { SearchBar } from "@/components/search/SearchBar";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [accessibilityFilters, setAccessibilityFilters] = useState<string[]>([]);
  const navigate = useNavigate();
  const voiceAssistant = VoiceAssistant.getInstance();

  // Available accessibility features for filtering
  const availableFeatures = [
    "Wheelchair Access",
    "Ramp",
    "Elevator",
    "Accessible Washroom",
    "Handrails",
    "Tactile Paving",
    "Braille"
  ];

  useEffect(() => {
    // Get user location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        
        // If there's a query in the URL, perform search
        const query = searchParams.get("q");
        if (query) {
          setSearchQuery(query);
          performSearch(query, [latitude, longitude]);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        
        // If there's a query in the URL, perform search without location
        const query = searchParams.get("q");
        if (query) {
          setSearchQuery(query);
          performSearch(query);
        }
      }
    );
  }, [searchParams]);

  const performSearch = async (query: string, location?: [number, number]) => {
    if (!query.trim()) return;
    
    try {
      setIsLoading(true);
      voiceAssistant.speak(`Searching for ${query}`);
      
      if (location) {
        // Search using Overpass API
        const searchResults = await searchPlaces(query, location[0], location[1]);
        
        if (searchResults.length > 0) {
          setPlaces(searchResults);
          setFilteredPlaces(searchResults);
          voiceAssistant.speak(`Found ${searchResults.length} results for ${query}`);
        } else {
          // Fallback to database search
          searchDatabase(query);
        }
      } else {
        // No location available, search database
        searchDatabase(query);
      }
    } catch (error) {
      console.error("Error searching places:", error);
      // Fallback to database search
      searchDatabase(query);
    } finally {
      setIsLoading(false);
    }
  };

  const searchDatabase = async (query: string) => {
    try {
      // In a real app, we would have a proper search endpoint
      // For now, we'll just do a simple filter on the client side
      const allPlaces = await fine.table("places").select();
      
      if (allPlaces && allPlaces.length > 0) {
        const matchedPlaces = allPlaces.filter(place => 
          place.name.toLowerCase().includes(query.toLowerCase()) ||
          place.address.toLowerCase().includes(query.toLowerCase()) ||
          place.placeType.toLowerCase().includes(query.toLowerCase())
        );
        
        // Convert to Place format
        const formattedPlaces = matchedPlaces.map(place => ({
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
        setFilteredPlaces(formattedPlaces);
        
        if (formattedPlaces.length > 0) {
          voiceAssistant.speak(`Found ${formattedPlaces.length} results for ${query}`);
        } else {
          voiceAssistant.speak(`No results found for ${query}`);
        }
      }
    } catch (error) {
      console.error("Error searching database:", error);
      voiceAssistant.speak("Error searching for places");
    }
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setSearchParams({ q: query });
      performSearch(query, userLocation || undefined);
    }
  };

  // Toggle accessibility feature filter
  const toggleAccessibilityFilter = (feature: string) => {
    setAccessibilityFilters(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature);
      } else {
        return [...prev, feature];
      }
    });
  };

  // Apply filters (both type and accessibility)
  useEffect(() => {
    let filtered = places;
    
    // Apply place type filter
    if (activeFilter !== "all") {
      filtered = filtered.filter(place => place.placeType === activeFilter);
    }
    
    // Apply accessibility filters
    if (accessibilityFilters.length > 0) {
      filtered = filtered.filter(place => {
        const features = Array.isArray(place.accessibilityFeatures) 
          ? place.accessibilityFeatures 
          : [];
          
        // Check if place has ANY of the selected accessibility features
        return accessibilityFilters.some(filter => features.includes(filter));
      });
    }
    
    setFilteredPlaces(filtered);
  }, [activeFilter, places, accessibilityFilters]);

  return (
    <div className="flex flex-col h-screen">
      <Header title="Search" showBackButton showSearch={false} />
      
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        <div className="p-4 space-y-4">
          <SearchBar 
            initialQuery={searchQuery}
            onSearch={handleSearch}
            expanded={true}
            placeholder="Search for accessible places..."
          />
          
          <Tabs defaultValue="all" onValueChange={setActiveFilter}>
            <div className="flex items-center justify-between mb-2">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="restaurant">Restaurants</TabsTrigger>
                <TabsTrigger value="hospital">Hospitals</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="transport">Transport</TabsTrigger>
                <TabsTrigger value="shopping">Shopping</TabsTrigger>
              </TabsList>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  const filterDialog = document.getElementById('accessibility-filters');
                  if (filterDialog) {
                    filterDialog.classList.toggle('hidden');
                  }
                }}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Accessibility filters */}
            <div id="accessibility-filters" className="hidden bg-muted p-3 rounded-md mb-3">
              <h3 className="text-sm font-medium mb-2">Filter by accessibility features:</h3>
              <div className="flex flex-wrap gap-2">
                {availableFeatures.map(feature => (
                  <Button
                    key={feature}
                    variant={accessibilityFilters.includes(feature) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleAccessibilityFilter(feature)}
                    className="text-xs"
                  >
                    {feature}
                  </Button>
                ))}
              </div>
            </div>
            
            <TabsContent value="all" className="mt-0">
              {renderResults()}
            </TabsContent>
            
            <TabsContent value="restaurant" className="mt-0">
              {renderResults()}
            </TabsContent>
            
            <TabsContent value="hospital" className="mt-0">
              {renderResults()}
            </TabsContent>
            
            <TabsContent value="education" className="mt-0">
              {renderResults()}
            </TabsContent>
            
            <TabsContent value="transport" className="mt-0">
              {renderResults()}
            </TabsContent>
            
            <TabsContent value="shopping" className="mt-0">
              {renderResults()}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );

  function renderResults() {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (searchParams.get("q") && filteredPlaces.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-lg font-medium">No results found</p>
          <p className="text-muted-foreground">Try a different search term or filter</p>
        </div>
      );
    }
    
    if (!searchParams.get("q")) {
      return (
        <div className="text-center py-8">
          <p className="text-lg font-medium">Search for places</p>
          <p className="text-muted-foreground">Enter a search term to find accessible places</p>
        </div>
      );
    }
    
    return (
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
            />
          );
        })}
      </div>
    );
  }
};

export default Search;