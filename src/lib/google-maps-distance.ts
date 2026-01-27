/**
 * Google Maps Distance Matrix API utility
 * Calculates real driving distance by road between two locations
 */

interface DistanceResult {
  distanceKm: number;
  distanceText: string;
  durationText: string;
  success: boolean;
}

/**
 * Calculate driving distance between two coordinates using Google Maps Distance Matrix API
 */
export async function calculateDrivingDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DistanceResult> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return fallbackToStraightLine(originLat, originLng, destLat, destLng);
    }

    const origin = `${originLat},${originLng}`;
    const destination = `${destLat},${destLng}`;
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=driving&units=metric&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      const distanceMeters = element.distance.value;
      const distanceKm = distanceMeters / 1000;

      return {
        distanceKm: Math.ceil(distanceKm), // Round up to nearest km
        distanceText: element.distance.text,
        durationText: element.duration.text,
        success: true,
      };
    } else {
      console.warn('Distance Matrix API returned non-OK status, falling back to straight-line', data.status);
      return fallbackToStraightLine(originLat, originLng, destLat, destLng);
    }
  } catch (error) {
    console.error('Error calculating driving distance:', error);
    return fallbackToStraightLine(originLat, originLng, destLat, destLng);
  }
}

/**
 * Fallback: Calculate straight-line distance using Haversine formula
 */
function fallbackToStraightLine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): DistanceResult {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  return {
    distanceKm: Math.ceil(distanceKm), // Round up
    distanceText: `${Math.ceil(distanceKm)} km`,
    durationText: 'Estimated',
    success: false, // Indicate this is a fallback
  };
}
