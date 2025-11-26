const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the shortest distance between two points on Earth's surface
 * using the Haversine formula.
 * 
 * Formula: d = 2R × arcsin(√(sin²((lat2 - lat1)/2) + cos(lat1) × cos(lat2) × sin²((lon2 - lon1)/2)))
 *
 * Source: https://stackoverflow.com/questions/14560999/using-the-haversine-formula-in-javascript
 **/  
export const calculateDistance = (lat1Deg, lon1Deg, lat2Deg, lon2Deg) => {
  function toRad(degree) {
    return degree * Math.PI / 180;
  }
    
  const lat1 = toRad(lat1Deg);
  const lon1 = toRad(lon1Deg);
  const lat2 = toRad(lat2Deg);
  const lon2 = toRad(lon2Deg);
    
  const { sin, cos, sqrt, atan2 } = Math;
    
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = sin(dLat / 2) * sin(dLat / 2)
            + cos(lat1) * cos(lat2)
            * sin(dLon / 2) * sin(dLon / 2);
  const c = 2 * atan2(sqrt(a), sqrt(1 - a)); 
  const d = EARTH_RADIUS_KM * c;
  return d; // distance in km
};

export default { calculateDistance };