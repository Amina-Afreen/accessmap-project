import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fine } from "@/lib/fine";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { AccessibilityFeatures } from "@/components/places/AccessibilityFeatures";
import { Check, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { Schema } from "@/lib/db-types";

const AddReview = () => {
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<Schema["places"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessibilityRating, setAccessibilityRating] = useState<"accessible" | "partially" | "not" | null>(null);
  const [comment, setComment] = useState("");
  const [availableFeatures] = useState([
    "Accessible Parking", "Elevator", "Handrails", "Alternative Entrance", 
    "Ramp", "Braille", "Scent-free", "Bright Lighting", "Spacious",
    "Gender Neutral Washroom", "Quiet", "Accessible Washroom", 
    "Outdoor Access Only", "Large Print", "StopGap Ramp"
  ]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { data: session } = fine.auth.useSession();

  useEffect(() => {
    const fetchPlaceDetails = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const place = await fine.table("places").select().eq("id", parseInt(id));
        
        if (place && place.length > 0) {
          setPlace(place[0]);
          
          // Pre-select features that are already associated with the place
          try {
            const placeFeatures = JSON.parse(place[0].accessibilityFeatures || '[]');
            setSelectedFeatures(placeFeatures);
          } catch (error) {
            console.error("Error parsing accessibility features:", error);
          }
        } else {
          toast.error("Place not found");
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
        toast.error("Failed to load place details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaceDetails();
  }, [id, navigate]);

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature);
      } else {
        return [...prev, feature];
      }
    });
  };

  const handleSubmit = async () => {
    if (!session?.user) {
      toast.error("You must be signed in to add a review");
      navigate("/login");
      return;
    }
    
    if (!accessibilityRating) {
      toast.error("Please select an accessibility rating");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Convert rating to number
      let ratingValue = 3; // Default to middle rating
      if (accessibilityRating === "accessible") ratingValue = 5;
      else if (accessibilityRating === "partially") ratingValue = 3;
      else if (accessibilityRating === "not") ratingValue = 1;
      
      // Create review
      const review = {
        placeId: parseInt(id!),
        userId: session.user.id,
        rating: ratingValue,
        comment: comment,
        accessibilityFeatures: JSON.stringify(selectedFeatures)
      };
      
      await fine.table("reviews").insert(review);
      
      // Update place with new features
      if (place) {
        try {
          // Merge existing features with new ones
          const existingFeatures = JSON.parse(place.accessibilityFeatures || '[]');
          const mergedFeatures = Array.from(new Set([...existingFeatures, ...selectedFeatures]));
          
          // Update place
          await fine.table("places").update({
            accessibilityFeatures: JSON.stringify(mergedFeatures)
          }).eq("id", place.id);
        } catch (error) {
          console.error("Error updating place features:", error);
        }
      }
      
      toast.success("Review added successfully");
      navigate(`/place-details/${id}`);
    } catch (error) {
      console.error("Error adding review:", error);
      toast.error("Failed to add review");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="Rate this place" showBackButton />
        <main className="flex-1 pt-14 pb-16 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full max-w-md px-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="Rate this place" showBackButton />
      
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        <div className="p-4 space-y-6">
          <h1 className="text-xl font-bold">{place?.name}</h1>
          
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-4">How accessible is this place?</h2>
              
              <div className="flex justify-between gap-2">
                <Button
                  variant={accessibilityRating === "accessible" ? "default" : "outline"}
                  className="flex-1 flex-col h-auto py-4"
                  onClick={() => setAccessibilityRating("accessible")}
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-2">
                    <ThumbsUp className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                  <span className="text-sm text-blue-600">Accessible</span>
                </Button>
                
                <Button
                  variant={accessibilityRating === "partially" ? "default" : "outline"}
                  className="flex-1 flex-col h-auto py-4"
                  onClick={() => setAccessibilityRating("partially")}
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-2">
                    <div className="text-orange-600 dark:text-orange-300">🚧</div>
                  </div>
                  <span className="text-sm text-blue-600">Partially Accessible</span>
                </Button>
                
                <Button
                  variant={accessibilityRating === "not" ? "default" : "outline"}
                  className="flex-1 flex-col h-auto py-4"
                  onClick={() => setAccessibilityRating("not")}
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-2">
                    <ThumbsDown className="h-5 w-5 text-red-600 dark:text-red-300" />
                  </div>
                  <span className="text-sm text-blue-600">Not Accessible</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2">Select accessibility features</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Select all features available at this location
              </p>
              
              <AccessibilityFeatures
                features={availableFeatures}
                selected={selectedFeatures}
                onToggle={toggleFeature}
                interactive={true}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2">Add a comment (optional)</h2>
              <Textarea
                placeholder="Share your experience about the accessibility of this place..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {1000 - comment.length} characters remaining
              </p>
            </CardContent>
          </Card>
          
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <Button 
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting || !accessibilityRating}
            >
              <Check className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default AddReview;