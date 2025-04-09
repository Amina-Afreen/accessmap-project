import { Badge } from "@/components/ui/badge";
import { 
  AccessibilityIcon, 
  Building2, 
  ArrowUpDown, 
  Eye, 
  Ear, 
  Lightbulb, 
  Blocks, 
  Sparkles,
  Footprints
} from "lucide-react";

interface AccessibilityFeaturesProps {
  features: string[];
  selected?: string[];
  onToggle?: (feature: string) => void;
  interactive?: boolean;
}

export function AccessibilityFeatures({
  features,
  selected = [],
  onToggle,
  interactive = false,
}: AccessibilityFeaturesProps) {
  // Map features to icons
  const getIcon = (feature: string) => {
    switch (feature.toLowerCase()) {
      case 'ramp':
      case 'wheelchair access':
        return <AccessibilityIcon className="h-3 w-3 mr-1" />;
      case 'elevator':
        return <Building2 className="h-3 w-3 mr-1" />;
      case 'handrails':
      case 'stopgap ramp':
        return <ArrowUpDown className="h-3 w-3 mr-1" />;
      case 'braille':
      case 'large print':
        return <Eye className="h-3 w-3 mr-1" />;
      case 'sign language':
        return <Ear className="h-3 w-3 mr-1" />;
      case 'bright lighting':
        return <Lightbulb className="h-3 w-3 mr-1" />;
      case 'accessible washroom':
      case 'gender neutral washroom':
        return <Blocks className="h-3 w-3 mr-1" />;
      case 'quiet':
      case 'scent-free':
        return <Sparkles className="h-3 w-3 mr-1" />;
      case 'outdoor access only':
        return <Footprints className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  const isSelected = (feature: string) => {
    return selected.includes(feature);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {features.map((feature, index) => (
        <Badge
          key={index}
          variant={isSelected(feature) ? "default" : "outline"}
          className={interactive ? "cursor-pointer" : ""}
          onClick={interactive ? () => onToggle && onToggle(feature) : undefined}
        >
          {getIcon(feature)}
          {feature}
        </Badge>
      ))}
    </div>
  );
}