// distance = (lat1, long1, lat2, long2) => {
//   const R = 6371e3;
//   const φ1 = (lat1 * Math.PI) / 180;
//   const φ2 = (lat2 * Math.PI) / 180;
//   const Δφ = ((lat2 - lat1) * Math.PI) / 180;
//   const Δλ = ((long2 - long1) * Math.PI) / 180;
//   const a =
//     Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//     Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   const d = R * c;
//   return d;
// };

// function toForgeCoordinate({ x, y }) {
//   return {
//     x: x,
//     y: y,
//   };
// }

// export const geographicToCartesian = (
//   latitudeCenter,
//   longitudeCenter,
//   latitude,
//   longitude
// ) => {
//   let distanceX = distance(
//     latitudeCenter,
//     longitudeCenter,
//     latitudeCenter,
//     longitude
//   );
//   let distanceY = distance(
//     latitudeCenter,
//     longitudeCenter,
//     latitude,
//     longitudeCenter
//   );

//   if (longitudeCenter * longitude > 0) {
//     console.log(longitudeCenter * longitude);

//     if (longitudeCenter > longitude) {
//       distanceX *= -1;
//     }
//   } else if (
//     longitudeCenter < 0 &&
//     longitude > 0 &&
//     Math.abs(longitudeCenter - longitude) > 180
//   ) {
//     distanceX *= -1;
//   }

//   if (latitudeCenter > latitude) {
//     distanceY *= -1;
//   }
//   return toForgeCoordinate({ x: distanceX, y: distanceY });
// };
