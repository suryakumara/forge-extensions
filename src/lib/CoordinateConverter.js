export class CoordinateConverter {
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
    this.R = 6371000;
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
    const φ1 = CoordinateConverter.degreeToRadian(this.center.latitude);
    const φ2 = CoordinateConverter.degreeToRadian(latitude);
    const Δφ = CoordinateConverter.degreeToRadian(
      latitude - this.center.latitude
    );
    const Δλ = CoordinateConverter.degreeToRadian(
      longitude - this.center.longitude
    );
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = this.R * c;
    return d;
  };

  geographicToCartesian = (latitude, longitude) => {
    let distanceX = this.distance(this.center.latitude, longitude);
    let distanceY = this.distance(latitude, this.center.longitude);

    if (this.center.longitude * longitude > 0) {
      if (this.center.longitude > longitude) {
        distanceX *= -1;
      }
    } else if (
      this.center.longitude < 0 &&
      longitude > 0 &&
      Math.abs(this.center.longitude - longitude) > 180
    ) {
      distanceX *= -1;
    }

    if (this.center.latitude > latitude) {
      distanceY *= -1;
    }
    return { x: distanceX, y: distanceY };
  };

  cartesianToGeographic = (x, y) => {
    const rEarth = 6378;
    const pi = Math.PI;
    const xPos = x / 1000;
    const yPos = y / 1000;
    const lat = this.center.latitude + (yPos / rEarth) * (180 / pi);
    const lng =
      this.center.longitude +
      ((xPos / rEarth) * (180 / pi)) /
        Math.cos((this.center.latitude * pi) / 180);

    return { latitude: lat, longitude: lng };
  };

  calculateUWBPosition(d, degreeAOA, directionDegree, deviceX, deviceY) {
    const r = d / 100;
    const radian = ((-degreeAOA + directionDegree) * Math.PI) / 180;
    let newX = r * Math.cos(radian);
    let newY = r * Math.sin(radian);
    newX += deviceX;
    newY += deviceY;
    return [newX, newY];
  }

  toLatitudeLongitudeEveryCorner(positionEveryCorner) {
    const newCoordinatesAfterRotate = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];

    for (let i = 0; i < positionEveryCorner[0].length; i += 1) {
      newCoordinatesAfterRotate[i] = this.cartesianToGeographic(
        positionEveryCorner[0][i],
        positionEveryCorner[1][i]
      );
    }
    return newCoordinatesAfterRotate;
  }

  setCoordinateBuilding = () => {
    const newCoordinatesAfterRotate = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    for (let i = 0; i < this.BUILDING_CORNER_LOCATION.length; i += 1) {
      newCoordinatesAfterRotate[i] = this.cartesianToGeographic(
        this.BUILDING_CORNER_LOCATION[i][0],
        this.BUILDING_CORNER_LOCATION[i][1]
      );
    }

    return newCoordinatesAfterRotate;
  };
}
