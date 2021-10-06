export default class CoordinateConverter {
  R = 6371000;

  center = {
    longitude,
    latitude,
  };

  static degreeToRadian(degree) {
    return (degree * Math.PI) / 180;
  }

  static forgeCoodinateToCartesianCoordinate(position) {
    return { x: position[0], y: position[1], z: position[2] };
  }

  static toForgeCoordinate({ x, y }) {
    return {
      x: x,
      y: y,
    };
  }

  constructor(latitude, longitude) {
    this.center = {
      latitude,
      longitude,
    };
  }

  getCenter() {
    return this.center;
  }

  setCenter(latitude, longitude) {
    this.cente = {
      latitude,
      longitude,
    };
  }

  /**
   * @returns distance (meter)
   */

  distance = (latitude, longitude) => {
    const R = 6371e3;
    const φ1 = CoordinateConverter.degreeToRadian(this.center.latitude);
    const φ2 = CoordinateConverter.degreeToRadian(latitude);
    const Δφ = CoordinateConverter.degreeToRadian(
      latitude - this.center.latitude
    );
    const Δλ = CoordinateConverter.degreeToRadian(
      (longitude = this.center.longitude)
    );
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = this.R * c;
    return d;
  };

  geographicToCartesian = (
    latitudeCenter,
    longitudeCenter,
    latitude,
    longitude
  ) => {
    let distanceX = this.distance(
      latitudeCenter,
      longitudeCenter,
      latitudeCenter,
      longitude
    );
    let distanceY = this.distance(
      latitudeCenter,
      longitudeCenter,
      latitude,
      longitudeCenter
    );

    if (longitudeCenter * longitude > 0) {
      console.log(longitudeCenter * longitude);

      if (longitudeCenter > longitude) {
        distanceX *= -1;
      }
    } else if (
      longitudeCenter < 0 &&
      longitude > 0 &&
      Math.abs(longitudeCenter - longitude) > 180
    ) {
      distanceX *= -1;
    }

    if (latitudeCenter > latitude) {
      distanceY *= -1;
    }
    return toForgeCoordinate({ x: distanceX, y: distanceY });
  };

  cartesianToGeographic = (x, y) => {
    const pi = Math.PI;
    const xPos = x / 1000;
    const yPos = y / 1000;
    const lat = this.center.latitude + (yPos / this.R) * (180 / pi);
    const lng =
      this.center.longitude +
      ((xPos / this.R) * (180 / pi)) /
        Math.cos((this.center.latitude * pi) / 180);
    return {
      latitude: lat,
      longitude: lng,
    };
  };
}
