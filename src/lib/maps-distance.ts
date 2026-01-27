/**
 * Google Maps Distance Matrix API integration
 * Calculates real road distance between two coordinates
 */

interface DistanceMatrixResponse {
  distanceKm: number;
  durationMinutes: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

/**
 * Calculate real road distance between two coordinates using Google Maps Distance Matrix API
 * @param origin - Starting point {lat, lng}
 * @param destination - End point {lat, lng}
 * @returns Promise with distance in kilometers and duration in minutes
 */
export async function calculateRoadDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<DistanceMatrixResponse> {
  try {
    // Check if Google Maps is loaded
    if (typeof google === 'undefined' || !google.maps) {
      console.warn('Google Maps not loaded, falling back to Haversine formula');
      return {
        distanceKm: calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng),
        durationMinutes: 0,
        status: 'error',
        errorMessage: 'Google Maps not loaded'
      };
    }

    const service = new google.maps.DistanceMatrixService();
    
    const response = await new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [new google.maps.LatLng(origin.lat, origin.lng)],
          destinations: [new google.maps.LatLng(destination.lat, destination.lng)],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false,
        },
        (response, status) => {
          if (status === google.maps.DistanceMatrixStatus.OK && response) {
            resolve(response);
          } else {
            reject(new Error(`Distance Matrix API failed with status: ${status}`));
          }
        }
      );
    });

    // Extract distance and duration from response
    const element = response.rows[0]?.elements[0];
    
    if (!element || element.status !== 'OK') {
      console.warn('Distance Matrix returned no results, falling back to Haversine');
      return {
        distanceKm: calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng),
        durationMinutes: 0,
        status: 'error',
        errorMessage: 'No route found'
      };
    }

    const distanceMeters = element.distance.value;
    const durationSeconds = element.duration.value;
    
    return {
      distanceKm: distanceMeters / 1000, // Convert meters to kilometers
      durationMinutes: Math.round(durationSeconds / 60), // Convert seconds to minutes
      status: 'success'
    };

  } catch (error) {
    console.error('Error calculating road distance:', error);
    
    // Fallback to Haversine formula (straight-line distance)
    return {
      distanceKm: calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng),
      durationMinutes: 0,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Haversine formula - calculates straight-line distance between two coordinates
 * Used as fallback when Distance Matrix API is unavailable
 * @param lat1 - Starting latitude
 * @param lon1 - Starting longitude
 * @param lat2 - Ending latitude
 * @param lon2 - Ending longitude
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Returns distance in kilometers
}

/**
 * Load Google Maps API if not already loaded
 * Call this before using calculateRoadDistance in client components
 */
export async function ensureGoogleMapsLoaded(): Promise<boolean> {
  try {
    // Check if already loaded
    if (typeof google !== 'undefined' && google.maps) {
      return true;
    }

    // Dynamically load Google Maps
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not configured');
      return false;
    }

    const { Loader } = await import('@googlemaps/js-api-loader');
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geocoding', 'geometry'],
    });

    await loader.load();
    return true;
  } catch (error) {
    console.error('Error loading Google Maps:', error);
    return false;
  }
}
