
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
    mumbai: { lat: 19.0760, lng: 72.8777 },
    pune: { lat: 18.5204, lng: 73.8567 },
    bangalore: { lat: 12.9716, lng: 77.5946 },
    delhi: { lat: 28.7041, lng: 77.1025 },
};

export function getCoordinatesForCity(city: string): { lat: number; lng: number } {
    const normalizedCity = city.toLowerCase();
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
        if (normalizedCity.includes(key)) {
            return coords;
        }
    }
    // Default to Mumbai if unknown
    return CITY_COORDINATES.mumbai;
}
