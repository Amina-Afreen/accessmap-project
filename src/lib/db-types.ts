export type Schema = {
  places: {
    id?: number;
    name: string;
    lat: number;
    lng: number;
    address: string;
    phone?: string | null;
    website?: string | null;
    accessibilityFeatures: string;
    rating?: number | null;
    placeType: string;
    createdAt?: string;
    updatedAt?: string;
    userId?: string | null;
  };
  
  reviews: {
    id?: number;
    placeId: number;
    userId: string;
    rating: number;
    comment?: string | null;
    accessibilityFeatures: string;
    createdAt?: string;
    updatedAt?: string;
  };
  
  userPreferences: {
    id?: number;
    userId: string;
    mobilityAid?: string | null;
    visualNeeds?: boolean;
    hearingNeeds?: boolean;
    cognitiveNeeds?: boolean;
    preferredRouteType?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
}