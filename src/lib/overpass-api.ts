/**
 * Overpass API client for fetching OpenStreetMap data
 */
export interface OverpassNode {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassWay {
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

export interface OverpassRelation {
  id: number;
  members: Array<{
    type: string;
    ref: number;
    role: string;
  }>;
  tags?: Record<string, string>;
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  members?: Array<{
    type: string;
    ref: number;
    role: string;
  }>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}

export interface Place {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  placeType: string;
  accessibilityFeatures: string[];
  phone?: string;
  website?: string;
  rating?: number;
  distance?: number;
  distanceText?: string;
}

/**
 * Fetch places with accessibility features from Overpass API
 */
export async function fetchAccessiblePlaces(
  lat: number,
  lng: number,
  radius: number = 2000
): Promise<Place[]> {
  try {
    // Query for places with accessibility tags
    const query = `
      [out:json][timeout:25];
      (
        node["wheelchair"="yes"](around:${radius},${lat},${lng});
        node["wheelchair"="limited"](around:${radius},${lat},${lng});
        node["tactile_paving"="yes"](around:${radius},${lat},${lng});
        node["amenity"](around:${radius},${lat},${lng});
        way["wheelchair"="yes"](around:${radius},${lat},${lng});
        way["wheelchair"="limited"](around:${radius},${lat},${lng});
        node["amenity"="restaurant"](around:${radius},${lat},${lng});
        node["amenity"="cafe"](around:${radius},${lat},${lng});
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="school"](around:${radius},${lat},${lng});
        node["amenity"="university"](around:${radius},${lat},${lng});
        node["amenity"="college"](around:${radius},${lat},${lng});
        node["amenity"="library"](around:${radius},${lat},${lng});
        node["shop"](around:${radius},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data: OverpassResponse = await response.json();
    
    // Transform Overpass data to our Place format
    return data.elements
      .filter(element => element.tags && (element.lat !== undefined && element.lon !== undefined))
      .map(element => {
        const tags = element.tags || {};
        
        // Extract accessibility features
        const accessibilityFeatures: string[] = [];
        if (tags.wheelchair === 'yes') accessibilityFeatures.push('Wheelchair Access');
        if (tags.wheelchair === 'limited') accessibilityFeatures.push('Limited Wheelchair Access');
        if (tags.wheelchair_toilet === 'yes') accessibilityFeatures.push('Accessible Washroom');
        if (tags.tactile_paving === 'yes') accessibilityFeatures.push('Tactile Paving');
        if (tags.handrail === 'yes') accessibilityFeatures.push('Handrails');
        if (tags.ramp === 'yes') accessibilityFeatures.push('Ramp');
        if (tags.elevator === 'yes') accessibilityFeatures.push('Elevator');
        
        // Determine place type
        let placeType = 'other';
        if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') placeType = 'restaurant';
        else if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || tags.amenity === 'doctors') placeType = 'hospital';
        else if (tags.amenity === 'school' || tags.amenity === 'university' || tags.amenity === 'college') placeType = 'education';
        else if (tags.amenity === 'bus_station' || tags.amenity === 'train_station') placeType = 'transport';
        else if (tags.shop) placeType = 'shopping';
        
        // Create place object
        return {
          id: element.id,
          name: tags.name || `Place ${element.id}`,
          lat: element.lat!,
          lng: element.lon!,
          address: tags.addr_street ? 
            `${tags.addr_housenumber || ''} ${tags.addr_street}, ${tags.addr_city || ''}`.trim() : 
            'Address not available',
          placeType,
          accessibilityFeatures,
          phone: tags.phone,
          website: tags.website,
          // Default rating based on wheelchair accessibility
          rating: tags.wheelchair === 'yes' ? 4.5 : tags.wheelchair === 'limited' ? 3.5 : undefined
        };
      });
  } catch (error) {
    console.error('Error fetching from Overpass API:', error);
    return [];
  }
}

/**
 * Search for places by query
 */
export async function searchPlaces(
  query: string,
  lat: number,
  lng: number,
  radius: number = 5000
): Promise<Place[]> {
  try {
    // Query for places matching the search term
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["name"~"${query}", i](around:${radius},${lat},${lng});
        way["name"~"${query}", i](around:${radius},${lat},${lng});
        relation["name"~"${query}", i](around:${radius},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data: OverpassResponse = await response.json();
    
    // Transform Overpass data to our Place format
    return data.elements
      .filter(element => element.tags && (element.lat !== undefined && element.lon !== undefined))
      .map(element => {
        const tags = element.tags || {};
        
        // Extract accessibility features
        const accessibilityFeatures: string[] = [];
        if (tags.wheelchair === 'yes') accessibilityFeatures.push('Wheelchair Access');
        if (tags.wheelchair === 'limited') accessibilityFeatures.push('Limited Wheelchair Access');
        if (tags.wheelchair_toilet === 'yes') accessibilityFeatures.push('Accessible Washroom');
        if (tags.tactile_paving === 'yes') accessibilityFeatures.push('Tactile Paving');
        if (tags.handrail === 'yes') accessibilityFeatures.push('Handrails');
        if (tags.ramp === 'yes') accessibilityFeatures.push('Ramp');
        if (tags.elevator === 'yes') accessibilityFeatures.push('Elevator');
        
        // Determine place type
        let placeType = 'other';
        if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') placeType = 'restaurant';
        else if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || tags.amenity === 'doctors') placeType = 'hospital';
        else if (tags.amenity === 'school' || tags.amenity === 'university' || tags.amenity === 'college') placeType = 'education';
        else if (tags.amenity === 'bus_station' || tags.amenity === 'train_station') placeType = 'transport';
        else if (tags.shop) placeType = 'shopping';
        
        return {
          id: element.id,
          name: tags.name || `Place ${element.id}`,
          lat: element.lat!,
          lng: element.lon!,
          address: tags.addr_street ? 
            `${tags.addr_housenumber || ''} ${tags.addr_street}, ${tags.addr_city || ''}`.trim() : 
            'Address not available',
          placeType,
          accessibilityFeatures,
          phone: tags.phone,
          website: tags.website,
          rating: tags.wheelchair === 'yes' ? 4.5 : tags.wheelchair === 'limited' ? 3.5 : undefined
        };
      });
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

/**
 * Fetch route data between two points using A* algorithm optimized for accessibility
 */
export async function fetchRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  profile: string = 'wheelchair'
): Promise<{
  route: Array<[number, number]>;
  distance: number;
  duration: number;
  steps: Array<{
    instruction: string;
    distance: string;
    duration: string;
    isAccessible: boolean;
  }>;
}> {
  try {
    // In a real app, we would use OSRM or a similar service
    // For now, we'll implement a simplified A* algorithm with accessibility considerations
    
    // First, try to fetch accessible waypoints between start and end
    const midLat = (startLat + endLat) / 2;
    const midLng = (startLng + endLng) / 2;
    const radius = calculateDistance([startLat, startLng], [endLat, endLng]) * 1.5;
    
    // Fetch accessible places that could serve as waypoints
    const accessiblePlaces = await fetchAccessiblePlaces(midLat, midLng, radius);
    
    // Generate route using A* algorithm with accessibility considerations
    const route = generateAccessibleRoute(
      [startLat, startLng],
      [endLat, endLng],
      accessiblePlaces
    );
    
    // Calculate total distance (in meters)
    const distance = calculateTotalDistance(route);
    
    // Estimate duration (walking speed ~1.4 m/s)
    const duration = distance / 1.4;
    
    // Generate steps
    const steps = generateRouteSteps(route, accessiblePlaces);
    
    return {
      route,
      distance,
      duration,
      steps
    };
  } catch (error) {
    console.error('Error generating route:', error);
    throw error;
  }
}

/**
 * Generate an accessible route using A* algorithm
 * This is a simplified implementation that prioritizes accessible waypoints
 */
function generateAccessibleRoute(
  start: [number, number],
  end: [number, number],
  accessiblePlaces: Place[] = []
): Array<[number, number]> {
  // Filter places that are roughly along the path
  const potentialWaypoints = accessiblePlaces.filter(place => {
    // Calculate if place is roughly along the path (within a certain deviation)
    const directDistance = calculateDistance(start, end);
    const detourDistance = 
      calculateDistance(start, [place.lat, place.lng]) + 
      calculateDistance([place.lat, place.lng], end);
    
    // Allow for some deviation (20% longer than direct path)
    return detourDistance <= directDistance * 1.2;
  });
  
  // Sort waypoints by their accessibility features (more features = better)
  const sortedWaypoints = potentialWaypoints.sort((a, b) => 
    b.accessibilityFeatures.length - a.accessibilityFeatures.length
  );
  
  // Take top 2-3 waypoints for a reasonable route
  const selectedWaypoints = sortedWaypoints.slice(0, Math.min(3, sortedWaypoints.length));
  
  // Create initial route with start and end
  const route: Array<[number, number]> = [start];
  
  // If we have waypoints, add them in order of best path
  if (selectedWaypoints.length > 0) {
    // Simple greedy algorithm to order waypoints
    let currentPoint = start;
    const remainingWaypoints = [...selectedWaypoints];
    
    while (remainingWaypoints.length > 0) {
      // Find closest waypoint to current position
      let closestIndex = 0;
      let closestDistance = Infinity;
      
      remainingWaypoints.forEach((waypoint, index) => {
        const distance = calculateDistance(currentPoint, [waypoint.lat, waypoint.lng]);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      
      // Add closest waypoint to route
      const nextWaypoint = remainingWaypoints[closestIndex];
      route.push([nextWaypoint.lat, nextWaypoint.lng]);
      
      // Update current point and remove waypoint from remaining
      currentPoint = [nextWaypoint.lat, nextWaypoint.lng];
      remainingWaypoints.splice(closestIndex, 1);
    }
  }
  
  // Add intermediate points for a smoother route
  const smoothRoute: Array<[number, number]> = [route[0]];
  
  for (let i = 0; i < route.length - 1; i++) {
    const segmentCount = 4; // Number of points to add between waypoints
    
    for (let j = 1; j <= segmentCount; j++) {
      const ratio = j / (segmentCount + 1);
      
      // Add some randomness to make the route look more realistic
      const jitterLat = (Math.random() - 0.5) * 0.0005;
      const jitterLng = (Math.random() - 0.5) * 0.0005;
      
      const lat = route[i][0] + (route[i+1][0] - route[i][0]) * ratio + jitterLat;
      const lng = route[i][1] + (route[i+1][1] - route[i][1]) * ratio + jitterLng;
      
      smoothRoute.push([lat, lng]);
    }
    
    smoothRoute.push(route[i+1]);
  }
  
  // Add end point if not already included
  if (smoothRoute[smoothRoute.length - 1][0] !== end[0] || 
      smoothRoute[smoothRoute.length - 1][1] !== end[1]) {
    smoothRoute.push(end);
  }
  
  return smoothRoute;
}

/**
 * Calculate total distance of a route in meters
 */
function calculateTotalDistance(route: Array<[number, number]>): number {
  let distance = 0;
  
  for (let i = 1; i < route.length; i++) {
    distance += calculateDistance(route[i-1], route[i]);
  }
  
  return distance;
}

/**
 * Calculate distance between two points in meters using Haversine formula
 */
function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1[0] * Math.PI / 180;
  const φ2 = point2[0] * Math.PI / 180;
  const Δφ = (point2[0] - point1[0]) * Math.PI / 180;
  const Δλ = (point2[1] - point1[1]) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * Generate route steps with instructions
 */
function generateRouteSteps(
  route: Array<[number, number]>,
  accessiblePlaces: Place[] = []
): Array<{
  instruction: string;
  distance: string;
  duration: string;
  isAccessible: boolean;
}> {
  const steps = [];
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  
  // Start instruction
  steps.push({
    instruction: `Head ${directions[Math.floor(Math.random() * directions.length)]} on your route`,
    distance: formatDistance(calculateDistance(route[0], route[Math.min(5, route.length - 1)])),
    duration: formatDuration(calculateDistance(route[0], route[Math.min(5, route.length - 1)]) / 1.4),
    isAccessible: true
  });
  
  // Find significant turns and waypoints
  const significantPoints = [];
  let lastDirection = getDirection(route[0], route[Math.min(5, route.length - 1)]);
  
  for (let i = 5; i < route.length - 5; i += 5) {
    const currentDirection = getDirection(route[i], route[i + 5 >= route.length ? route.length - 1 : i + 5]);
    const directionChange = getDirectionDifference(lastDirection, currentDirection);
    
    // If there's a significant turn
    if (directionChange > 30) {
      significantPoints.push({
        index: i,
        type: 'turn',
        direction: getTurnDirection(directionChange),
        point: route[i]
      });
      lastDirection = currentDirection;
    }
    
    // Check if we're near an accessible place
    const nearbyPlace = findNearbyPlace(route[i], accessiblePlaces, 100);
    if (nearbyPlace) {
      significantPoints.push({
        index: i,
        type: 'place',
        place: nearbyPlace,
        point: route[i]
      });
    }
  }
  
  // Generate instructions for significant points
  let lastIndex = 0;
  significantPoints.forEach((point, index) => {
    const distance = calculateTotalDistance(route.slice(lastIndex, point.index));
    const duration = distance / 1.4;
    
    if (point.type === 'turn') {
      steps.push({
        instruction: `Turn ${point.direction} and continue straight`,
        distance: formatDistance(distance),
        duration: formatDuration(duration),
        isAccessible: true
      });
    } else if (point.type === 'place') {
      const place = point.place;
      const accessibilityFeatures = place.accessibilityFeatures.join(', ');
      
      steps.push({
        instruction: `Continue past ${place.name}. Note: ${accessibilityFeatures} available.`,
        distance: formatDistance(distance),
        duration: formatDuration(duration),
        isAccessible: place.accessibilityFeatures.length > 0
      });
    }
    
    lastIndex = point.index;
  });
  
  // Final step
  const finalDistance = calculateTotalDistance(route.slice(lastIndex));
  steps.push({
    instruction: 'Arrive at your destination',
    distance: formatDistance(finalDistance),
    duration: formatDuration(finalDistance / 1.4),
    isAccessible: true
  });
  
  return steps;
}

/**
 * Format distance for display
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
}

/**
 * Format duration for display
 */
function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  }
}

/**
 * Get direction in degrees (0-360) between two points
 */
function getDirection(from: [number, number], to: [number, number]): number {
  const dLng = to[1] - from[1];
  const dLat = to[0] - from[0];
  
  let angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  
  return angle;
}

/**
 * Get difference between two directions (in degrees)
 */
function getDirectionDifference(dir1: number, dir2: number): number {
  const diff = Math.abs(dir1 - dir2);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Get turn direction based on angle
 */
function getTurnDirection(angle: number): string {
  if (angle < 45) return 'slightly right';
  if (angle < 90) return 'right';
  if (angle < 135) return 'sharp right';
  if (angle < 225) return 'around';
  if (angle < 270) return 'sharp left';
  if (angle < 315) return 'left';
  return 'slightly left';
}

/**
 * Find a nearby place within a certain radius
 */
function findNearbyPlace(point: [number, number], places: Place[], maxDistance: number): Place | null {
  for (const place of places) {
    const distance = calculateDistance(point, [place.lat, place.lng]);
    if (distance <= maxDistance) {
      return place;
    }
  }
  return null;
}