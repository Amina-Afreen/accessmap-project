import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fine } from "@/lib/fine";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map } from "@/components/map/Map";
import { AccessibilityFeatures } from "@/components/places/AccessibilityFeatures";
import { Camera, MapPin, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { Schema } from "@/lib/db-types";
import { VoiceAssistant } from "@/lib/voice-assistant";

const AddPlace = () => {
  const [formData, setFormData] = useState<Partial<Schema["places"]>>({
    name: "",
    address: "",
    lat: 0,
    lng: 0,
    phone: "",
    website: "",
    placeType: "",
    accessibilityFeatures: "[]"
  });
  
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableFeatures] = useState([
    "Ramp", "Elevator", "Handrails", "Automatic Doors", 
    "Accessible Washroom", "Gender Neutral Washroom", "Braille", 
    "Large Print", "Sign Language", "Quiet", "Bright Lighting",
    "Spacious", "StopGap Ramp", "Outdoor Access Only"
  ]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  
  const navigate = useNavigate();
  const { data: session } = fine.auth.useSession();
  const voiceAssistant = VoiceAssistant.getInstance();

  useEffect(() => {
    // Announce page
    voiceAssistant.speak("Add place page. Fill in the details to add a new accessible place.");
    
    // Get user location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setSelectedLocation([latitude, longitude]);
        setFormData(prev => ({ ...prev, lat: latitude, lng: longitude }));
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Could not access your location");
        voiceAssistant.speak("Could not access your location");
      }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation([lat, lng]);
    setFormData(prev => ({ ...prev, lat, lng }));
    
    // Try to get address from coordinates using reverse geocoding
    // This would typically use a geocoding service like Google Maps or Nominatim
    toast.info("Location selected");
    voiceAssistant.speak("Location selected");
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature);
      } else {
        return [...prev, feature];
      }
    });
  };

  const handleVoiceInput = (fieldName: string) => {
    setIsListening(true);
    voiceAssistant.speak(`Please say the ${fieldName}`);
    
    voiceAssistant.registerCommand("*", (transcript) => {
      if (transcript) {
        setFormData(prev => ({ ...prev, [fieldName]: transcript }));
        voiceAssistant.speak(`${fieldName} set to ${transcript}`);
      }
      setIsListening(false);
      voiceAssistant.unregisterCommand("*");
    });
    
    const success = voiceAssistant.startListening();
    if (!success) {
      toast.error("Voice recognition not available");
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      toast.error("You must be signed in to add a place");
      voiceAssistant.speak("You must be signed in to add a place");
      navigate("/login");
      return;
    }
    
    if (!formData.name || !formData.address || !selectedLocation) {
      toast.error("Please fill in all required fields");
      voiceAssistant.speak("Please fill in all required fields");
      return;
    }
    
    try {
      setIsSubmitting(true);
      voiceAssistant.speak("Adding place...");
      
      // Update accessibility features
      const updatedFormData: Schema["places"] = {
        name: formData.name || "",
        address: formData.address || "",
        lat: formData.lat || 0,
        lng: formData.lng || 0,
        phone: formData.phone || null,
        website: formData.website || null,
        placeType: formData.placeType || "other",
        accessibilityFeatures: JSON.stringify(selectedFeatures),
        userId: session.user.id
      };
      
      await fine.table("places").insert(updatedFormData);
      
      toast.success("Place added successfully");
      voiceAssistant.speak("Place added successfully");
      navigate("/");
    } catch (error) {
      console.error("Error adding place:", error);
      toast.error("Failed to add place");
      voiceAssistant.speak("Failed to add place");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Add Place" showBackButton />
      
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Place Name *</Label>
                  <div className="flex">
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter place name"
                      required
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      className="ml-2"
                      onClick={() => handleVoiceInput("name")}
                      disabled={isListening}
                    >
                      {isListening ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="placeType">Place Type *</Label>
                  <Select
                    value={formData.placeType || ""}
                    onValueChange={(value) => handleSelectChange("placeType", value)}
                  >
                    <SelectTrigger id="placeType">
                      <SelectValue placeholder="Select place type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <div className="flex">
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter full address"
                      required
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      className="ml-2 self-start"
                      onClick={() => handleVoiceInput("address")}
                      disabled={isListening}
                    >
                      {isListening ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex">
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone || ""}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      className="ml-2"
                      onClick={() => handleVoiceInput("phone")}
                      disabled={isListening}
                    >
                      {isListening ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="flex">
                    <Input
                      id="website"
                      name="website"
                      value={formData.website || ""}
                      onChange={handleInputChange}
                      placeholder="Enter website URL"
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      className="ml-2"
                      onClick={() => handleVoiceInput("website")}
                      disabled={isListening}
                    >
                      {isListening ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <Label>Location *</Label>
                <p className="text-sm text-muted-foreground">
                  Tap on the map to select the location or use your current location
                </p>
                
                <div className="h-64 rounded-md overflow-hidden border">
                  <Map
                    center={userLocation || undefined}
                    zoom={15}
                    markers={selectedLocation ? [
                      { id: 1, position: selectedLocation, title: "Selected Location" }
                    ] : []}
                    onMapClick={handleMapClick}
                    showUserLocation={true}
                  />
                </div>
                
                {selectedLocation && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    Selected: {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
                  </div>
                )}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    if (userLocation) {
                      setSelectedLocation(userLocation);
                      setFormData(prev => ({ ...prev, lat: userLocation[0], lng: userLocation[1] }));
                      voiceAssistant.speak("Using your current location");
                    } else {
                      toast.error("Could not access your location");
                      voiceAssistant.speak("Could not access your location");
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Use My Current Location
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <Label>Accessibility Features</Label>
                <p className="text-sm text-muted-foreground">
                  Select all accessibility features available at this location
                </p>
                
                <AccessibilityFeatures
                  features={availableFeatures}
                  selected={selectedFeatures}
                  onToggle={toggleFeature}
                  interactive={true}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <Label>Photos</Label>
                <p className="text-sm text-muted-foreground">
                  Add photos of the location and its accessibility features
                </p>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-32 border-dashed"
                >
                  <div className="flex flex-col items-center">
                    <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span>Add photos</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding Place...
              </>
            ) : (
              "Add Place"
            )}
          </Button>
        </form>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default AddPlace;