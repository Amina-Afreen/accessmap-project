import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Locate, ZoomIn, ZoomOut, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchAccessiblePlaces, Place } from "@/lib/overpass-api";
import { VoiceAssistant } from "@/lib/voice-assistant";

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: number;
    position: [number, number];
    title: string;
    type?: string;
  }>;
  route?: Array<[number, number]>;
  onMarkerClick?: (id: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showUserLocation?: boolean;
  onPlacesLoaded?: (places: Place[]) => void;
}

export function Map({
  center = [13.0499, 80.2177], // Chennai default
  zoom = 14,
  markers = [],
  route = [],
  onMarkerClick,
  onMapClick,
  showUserLocation = true,
  onPlacesLoaded,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const navigate = useNavigate();
  const voiceAssistant = VoiceAssistant.getInstance();
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    // Load OpenStreetMap via Leaflet
    const loadMap = async () => {
      try {
        if (!mapRef.current || mapInstanceRef.current) return;
        
        // Create map instance
        const map = L.map(mapRef.current, {
          zoomControl: false // We'll add custom zoom controls
        }).setView(center, zoom);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Store map instance
        mapInstanceRef.current = map;
        
        // Get user location if enabled
        if (showUserLocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setUserLocation([latitude, longitude]);
              
              // Add user marker
              const userIcon = L.divIcon({
                html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>`,
                className: 'user-location-marker',
                iconSize: [16, 16]
              });
              
              L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
              
              // Center map on user location
              map.setView([latitude, longitude], 16);
              
              // Load nearby places from Overpass API
              loadNearbyPlaces(latitude, longitude);
              
              // Announce location found
              voiceAssistant.speak("Location found. Map is ready.");
            },
            (error) => {
              console.error("Error getting location:", error);
              toast.error("Could not access your location");
              voiceAssistant.speak("Could not access your location. Using default location.");
            }
          );
        }
        
        // Add click handler to map
        if (onMapClick) {
          map.on('click', (e: L.LeafletMouseEvent) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          });
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading map:", error);
        toast.error("Failed to load map");
        setIsLoading(false);
      }
    };
    
    loadMap();
    
    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);
  
  // Load nearby places from Overpass API
  const loadNearbyPlaces = async (lat: number, lng: number) => {
    try {
      setLoadingPlaces(true);
      const places = await fetchAccessiblePlaces(lat, lng, 2000);
      
      if (places.length > 0) {
        // Add markers for places
        addPlaceMarkers(places);
        
        // Pass places to parent component
        if (onPlacesLoaded) {
          onPlacesLoaded(places);
        }
        
        toast.success(`Found ${places.length} accessible places nearby`);
        voiceAssistant.speak(`Found ${places.length} accessible places nearby`);
      } else {
        toast.info("No accessible places found nearby");
        voiceAssistant.speak("No accessible places found nearby");
      }
    } catch (error) {
      console.error("Error loading nearby places:", error);
      toast.error("Failed to load nearby places");
    } finally {
      setLoadingPlaces(false);
    }
  };
  
  // Add markers for places
  const addPlaceMarkers = (places: Place[]) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];
    
    places.forEach(place => {
      const icon = L.divIcon({
        html: `<div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                ${place.placeType === 'hospital' ? '🏥' : place.placeType === 'restaurant' ? '🍽️' : place.placeType === 'education' ? '🎓' : '📍'}
              </div>`,
        className: 'custom-marker',
        iconSize: [24, 24]
      });
      
      const marker = L.marker([place.lat, place.lng], { icon, title: place.name })
        .addTo(map)
        .on('click', () => {
          if (onMarkerClick) {
            onMarkerClick(place.id);
          } else {
            navigate(`/place-details/${place.id}`);
          }
        });
        
      markersRef.current.push(marker);
    });
  };
  
  // Update markers when they change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    try {
      // Clear existing markers
      markersRef.current.forEach(marker => map.removeLayer(marker));
      markersRef.current = [];
      
      // Add user location marker back if available
      if (userLocation) {
        const userIcon = L.divIcon({
          html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>`,
          className: 'user-location-marker',
          iconSize: [16, 16]
        });
        
        const userMarker = L.marker(userLocation, { icon: userIcon }).addTo(map);
        markersRef.current.push(userMarker);
      }
      
      // Add new markers
      markers.forEach((marker) => {
        const icon = L.divIcon({
          html: `<div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                  ${marker.type === 'hospital' ? '🏥' : marker.type === 'restaurant' ? '🍽️' : marker.type === 'education' ? '🎓' : '📍'}
                </div>`,
          className: 'custom-marker',
          iconSize: [24, 24]
        });
        
        const newMarker = L.marker(marker.position, { icon, title: marker.title })
          .addTo(map)
          .on('click', () => {
            if (onMarkerClick) {
              onMarkerClick(marker.id);
            } else {
              navigate(`/place-details/${marker.id}`);
            }
          });
          
        markersRef.current.push(newMarker);
      });
    } catch (error) {
      console.error("Error updating markers:", error);
    }
  }, [markers, userLocation]);
  
  // Update route when it changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    try {
      // Remove existing route
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      
      // Add new route
      if (route.length > 1) {
        routeLayerRef.current = L.polyline(route, { 
          color: 'blue', 
          weight: 5,
          opacity: 0.7,
          lineJoin: 'round'
        }).addTo(map);
        
        // Add start and end markers
        const startIcon = L.divIcon({
          html: `<div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">S</div>`,
          className: 'start-marker',
          iconSize: [24, 24]
        });
        
        const endIcon = L.divIcon({
          html: `<div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">E</div>`,
          className: 'end-marker',
          iconSize: [24, 24]
        });
        
        const startMarker = L.marker(route[0], { icon: startIcon }).addTo(map);
        const endMarker = L.marker(route[route.length - 1], { icon: endIcon }).addTo(map);
        
        markersRef.current.push(startMarker, endMarker);
        
        // Fit map to route bounds
        const bounds = L.latLngBounds(route);
        map.fitBounds(bounds, { padding: [50, 50] });
        
        // Announce route
        voiceAssistant.speak("Route generated. Follow the blue line on the map.");
      }
    } catch (error) {
      console.error("Error updating route:", error);
    }
  }, [route]);

  // Zoom in handler
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  // Zoom out handler
  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  // Center on user location
  const handleCenterOnUser = () => {
    if (!userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 16);
          }
          
          // Load nearby places
          loadNearbyPlaces(latitude, longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not access your location");
          voiceAssistant.speak("Could not access your location");
        }
      );
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(userLocation, 16);
    }
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map controls */}
      <div className="absolute right-4 top-20 flex flex-col space-y-2 z-20">
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow-lg"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow-lg"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow-lg"
          onClick={handleCenterOnUser}
        >
          <Locate className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow-lg"
          onClick={() => {
            // Toggle map layers (satellite, terrain, etc.)
            toast.info("Map layer options coming soon");
          }}
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Loading indicator for places */}
      {loadingPlaces && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg z-20 flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
          <span className="text-sm">Loading nearby places...</span>
        </div>
      )}
    </div>
  );
}