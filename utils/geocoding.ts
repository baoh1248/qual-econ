/**
 * Geocoding Utility
 * Converts addresses to latitude/longitude coordinates
 * Uses expo-location native geocoder (Apple Maps / Google Maps) as primary,
 * with OpenStreetMap Nominatim API as fallback
 */

import * as Location from 'expo-location';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  success: boolean;
  error?: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Convert an address to latitude/longitude coordinates
 * Tries native platform geocoder first (more reliable), falls back to Nominatim
 * @param address The address to geocode
 * @returns GeocodingResult with coordinates or error
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  if (!address || address.trim().length === 0) {
    return {
      latitude: 0,
      longitude: 0,
      displayName: '',
      success: false,
      error: 'Address is empty',
    };
  }

  const trimmedAddress = address.trim();

  // Try native platform geocoding first (Apple Maps on iOS, Google Maps on Android)
  try {
    const nativeResults = await Location.geocodeAsync(trimmedAddress);
    if (nativeResults.length > 0) {
      const result = nativeResults[0];
      if (isValidCoordinates(result.latitude, result.longitude)) {
        console.log('✅ Native geocoding succeeded for:', trimmedAddress);
        return {
          latitude: result.latitude,
          longitude: result.longitude,
          displayName: trimmedAddress,
          success: true,
        };
      }
    }
    console.warn('⚠️ Native geocoding returned no valid results, trying Nominatim...');
  } catch (nativeError) {
    console.warn('⚠️ Native geocoding failed, trying Nominatim:', nativeError);
  }

  // Fall back to OpenStreetMap Nominatim API
  try {
    const encodedAddress = encodeURIComponent(trimmedAddress);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'QualEcon-CleaningApp/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}`);
    }

    const data: NominatimResponse[] = await response.json();

    if (data.length === 0) {
      return {
        latitude: 0,
        longitude: 0,
        displayName: '',
        success: false,
        error: 'Address not found by any geocoding service',
      };
    }

    const result = data[0];
    console.log('✅ Nominatim geocoding succeeded for:', trimmedAddress);
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      success: true,
    };
  } catch (error) {
    console.error('❌ All geocoding methods failed for:', trimmedAddress, error);
    return {
      latitude: 0,
      longitude: 0,
      displayName: '',
      success: false,
      error: error instanceof Error ? error.message : 'All geocoding methods failed',
    };
  }
}

/**
 * Batch geocode multiple addresses
 * Note: Has a 1-second delay between requests to respect Nominatim rate limits
 * @param addresses Array of addresses to geocode
 * @returns Array of GeocodingResults
 */
export async function batchGeocodeAddresses(
  addresses: string[]
): Promise<GeocodingResult[]> {
  const results: GeocodingResult[] = [];

  for (let i = 0; i < addresses.length; i++) {
    const result = await geocodeAddress(addresses[i]);
    results.push(result);

    // Rate limiting: wait 1 second between requests (Nominatim requirement)
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(lat: number | undefined | null, lng: number | undefined | null): boolean {
  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
}
