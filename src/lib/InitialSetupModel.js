export class InitialModel {
  constructor(viewer, option, selfOption) {
    this.viewer = viewer;
    this.option = option;
    this.beeController = selfOption.controllerModel;
    this.coordinateConverter = selfOption.converter;
  }

  setupInitialModel() {
    this.initRestrictedArea();
    this.initWorker();
    this.initExcavator();
  }

  initRestrictedArea() {
    const resCust = {
      id: "E143231A43",
      geoLocation: [
        [121.51998, 25.07044],
        [121.51981, 25.0702],
        [121.52, 25.06996],
        [121.5202, 25.07019],
        [121.52051, 25.07027],
        [121.52035, 25.07043],
      ],
      height: 5,
    };

    const newCoords = this.coordinateConverter.geographicToCartesian2D(
      resCust.geoLocation
    );

    this.beeController.addCustomRestrictedArea(
      resCust.id,
      newCoords,
      resCust.height
    );
  }

  initExcavator() {
    const excavatorProps = {
      id: "E1231A43",
      position: [5, 20, 0],
      rotation: [0, 0, 0],
    };

    this.beeController.addExcavator(
      excavatorProps.id,
      excavatorProps.position,
      excavatorProps.rotation
    );
  }

  initWorker() {
    const humaProp = {
      id: "12A312",
      position: [10, 10, 0],
      rotation: [0, 0, 0],
    };

    this.beeController.addNewWorker(
      humaProp.id,
      humaProp.position,
      humaProp.rotation
    );
  }

  initBeacon() {
    const beaconProp = {
      id: "E143231A43",
      position: [-5, 10, 0],
      rotation: [0, 0, 0],
    };
    this.beeController.addBeacon(
      beaconProp.id,
      beaconProp.position,
      beaconProp.rotation
    );
  }

  gridAndWindDirection() {
    this.beeController.addGrid();
    this.beeController.addWindDirection(1233);
  }
}
