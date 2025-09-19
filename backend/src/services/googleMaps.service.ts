import axios from 'axios';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
}

interface GeocodingResult {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    place_id: string;
    formatted_address: string;
  }>;
  status: string;
}

export class GoogleMapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Google Maps API key is required');
    }
  }

  /**
   * Convert address to coordinates using Geocoding API
   */
  async geocodeAddress(address: string): Promise<Coordinates | null> {
    try {
      const response = await axios.get<GeocodingResult>(
        `${this.baseUrl}/geocode/json`,
        {
          params: {
            address: address,
            key: this.apiKey,
          },
        }
      );

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Get place details using Places API
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/place/details/json`,
        {
          params: {
            place_id: placeId,
            fields: 'place_id,name,formatted_address,geometry,rating,user_ratings_total',
            key: this.apiKey,
          },
        }
      );

      if (response.data.status === 'OK') {
        return response.data.result;
      }

      return null;
    } catch (error) {
      console.error('Place details error:', error);
      return null;
    }
  }

  /**
   * Search for places using Places API Text Search
   */
  async searchPlace(query: string): Promise<PlaceDetails | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/place/textsearch/json`,
        {
          params: {
            query: query,
            key: this.apiKey,
          },
        }
      );

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          place_id: result.place_id,
          name: result.name,
          formatted_address: result.formatted_address,
          geometry: result.geometry,
          rating: result.rating,
          user_ratings_total: result.user_ratings_total,
        };
      }

      return null;
    } catch (error) {
      console.error('Place search error:', error);
      return null;
    }
  }

  /**
   * Generate Google Maps link for a place
   */
  generateMapsLink(placeId?: string, address?: string, coordinates?: Coordinates): string {
    if (placeId) {
      return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    }

    if (coordinates) {
      return `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
    }

    if (address) {
      const encodedAddress = encodeURIComponent(address);
      return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }

    return '';
  }

  /**
   * Generate Google Maps embed link
   */
  generateEmbedLink(placeId?: string, address?: string, coordinates?: Coordinates): string {
    if (placeId) {
      return `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=place_id:${placeId}`;
    }

    if (coordinates) {
      return `https://www.google.com/maps/embed/v1/view?key=${this.apiKey}&center=${coordinates.latitude},${coordinates.longitude}&zoom=15`;
    }

    if (address) {
      const encodedAddress = encodeURIComponent(address);
      return `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=${encodedAddress}`;
    }

    return '';
  }

  /**
   * Get hospital location data (coordinates and place ID)
   */
  async getHospitalLocationData(hospitalName: string, address: string): Promise<{
    coordinates: Coordinates | null;
    placeId: string | null;
    mapsLink: string;
    embedLink: string;
  }> {
    // First try to search for the place using hospital name and address
    const searchQuery = `${hospitalName}, ${address}`;
    const placeDetails = await this.searchPlace(searchQuery);

    let coordinates: Coordinates | null = null;
    let placeId: string | null = null;

    if (placeDetails) {
      coordinates = {
        latitude: placeDetails.geometry.location.lat,
        longitude: placeDetails.geometry.location.lng,
      };
      placeId = placeDetails.place_id;
    } else {
      // Fallback to geocoding if place search fails
      coordinates = await this.geocodeAddress(address);
    }

    const mapsLink = this.generateMapsLink(placeId, address, coordinates);
    const embedLink = this.generateEmbedLink(placeId, address, coordinates);

    return {
      coordinates,
      placeId,
      mapsLink,
      embedLink,
    };
  }
}

export default new GoogleMapsService();
