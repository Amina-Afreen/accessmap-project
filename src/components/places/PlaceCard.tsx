import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccessibilityIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PlaceCardProps {
  id: number;
  name: string;
  address: string;
  accessibilityFeatures: string[] | string;
  image?: string;
  rating?: number;
  distance?: string;
  placeType?: string;
  className?: string;
}

export function PlaceCard({
  id,
  name,
  address,
  accessibilityFeatures,
  image,
  rating,
  distance,
  placeType,
  className,
}: PlaceCardProps) {
  // Parse accessibility features if it's a string
  const features = Array.isArray(accessibilityFeatures) 
    ? accessibilityFeatures 
    : JSON.parse(accessibilityFeatures || '[]');
  
  return (
    <Link to={`/place-details/${id}`}>
      <Card className={cn("overflow-hidden", className)}>
        <div className="relative">
          {image && (
            <img 
              src={image} 
              alt={name} 
              className="w-full h-40 object-cover"
            />
          )}
          
          {features.includes("Ramp") && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <AccessibilityIcon className="h-3 w-3 mr-1" />
                Accessible
              </Badge>
            </div>
          )}
          
          {rating && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                ★ {rating.toFixed(1)}
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg">{name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">{address}</p>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {features.slice(0, 3).map((feature: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
            {features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{features.length - 3} more
              </Badge>
            )}
          </div>
          
          <div className="flex justify-between items-center mt-3">
            {placeType && (
              <Badge variant="secondary" className="capitalize">
                {placeType}
              </Badge>
            )}
            
            {distance && (
              <span className="text-sm text-muted-foreground">
                {distance}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}