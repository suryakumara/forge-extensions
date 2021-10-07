/* mapboxgl */
import { BeeInventorModel } from "./BeeInventorModel";
import { CoordinateConverter } from "./CoordinateConverter";
export class BeeInventorPanel extends Autodesk.Viewing.UI.DockingPanel {
  constructor(viewer, container, id, title, options) {
    super(container, id, title, options);
    this.viewer = viewer;
    this.options = options;
    // docking panel
    this.container.classList.add("docking-panel-container-solid-color-a");
    this.container.style.top = "10px";
    this.container.style.left = "10px";
    this.container.style.width = "500px";
    this.container.style.padding = "10px";
    this.container.style.height = "700px";
    this.container.style.resize = "auto";

    this.sceneBuilder = null;
    this.modelBuilder = null;
    this.input = null;
    this.inputValueDbId = null;
    this.inputPosX = null;
    this.inputPosY = null;
    this.inputPosZ = null;
    this.newGeo = null;
    this.tagId = null;

    // Initial Value
    this.coordinateConverter = new CoordinateConverter(
      25.069771049083982,
      121.52045303099948
    );
    this.centerLat = 25.069771049083982;
    this.centerLong = 121.52045303099948;
    this.angle = 135;
    this.deviceX = 4;
    this.deviceY = -5;
    this.BUILDING_CORNER_LOCATION = [
      [-4, 5],
      [-4, -5],
      [4, -5],
      [4, 5],
    ];

    this.iconMapbox = [
      {
        url: `${CDN_DOMAIN}/assets/images/png/img_dasloop_pin_online.png`,
        id: "worker",
        longLat: [121.52045833593478, 25.069785141828287],
      },
      {
        url: `${CDN_DOMAIN}/assets/images/png/img_gps_plant_pin_online.png`,
        id: "excavator",
        longLat: [121.5203549994178, 25.069866644921674],
      },
    ];

    this.positionRestrictedArea_X = -10;
    this.positionRestrictedArea_Y = 5;
    this.restricAreaSize_X = 1;
    this.restricAreaSize_Y = 1;
    this.restricAreaSize_Z = 1;
    this.positionExcavator_X = 10;
    this.positionExcavator_Y = 5;
    this.valueX = null;
    this.valueY = null;
    this.valueZ = null;
    this.human = null;
    this.plant = null;
    this.positionValue = null;
    this.positionUWB = null;
    this.datasAPI = null;
    this.infoDegree = null;
    this.infoDistance = null;
    this.infoWorkerPosition = null;

    // modelBuilder for custom Autodesk Forge
    this.viewer
      .loadExtension("Autodesk.Viewing.SceneBuilder")
      .then((builder) => {
        this.sceneBuilder = builder;
        return this.sceneBuilder.addNewModel({
          modelNameOverride: "Beacon",
          conserveMemory: false,
        });
      })
      .then((builder) => {
        this.modelBuilder = builder;
        this.loadWorker(this.modelBuilder);
        console.log("modelBuilder Created.");
      });

    this.viewer.loadExtension("Autodesk.glTF");
    this.newModel = new BeeInventorModel(this.viewer, this.options);

    // mapbox
    this.containerMapbox = document.createElement("div");
    this.containerMapbox.setAttribute("id", "map");
    this.container.append(this.containerMapbox);
    mapboxgl.accessToken =
      "pk.eyJ1IjoiYmVlaW52ZW50b3IiLCJhIjoiY2p1anFjbTY0MW9hMDRlcDRzMW9tcHJ1OSJ9.9WIfYAKd10XIdwWpB9EZFQ";
    this.map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [this.centerLong, this.centerLat],
    });
    this.map.zoomTo(19.5);

    // Features
    this.loadPlantModel();
    this.loadWorkerModel();
    this.getDataUWB();
    this.setNewWorker();
    this.setNewRestrictedArea();
    this.setNewBeacon();
    this.setNewPlant();
    this.setZoomToModel();
    this.createInput();
    this.setUpForm();
    this.setVisibility();
    this.setMapbox();
    this.setDrawLine();
    this.setDasloop();
    this.lookAtMe();
    this.setInfoDetails();
  }

  getDataUWB() {
    setInterval(() => {
      fetch("http://localhost:8080/mqtt/mockdata")
        .then((res) => res.json())
        .then((res) => {
          this.workerPosition(res);
          this.tagId = res.tagId;
        })
        .catch((err) => console.log(err));
    }, 2000);
  }

  calculateUWBPosition(d, directionDegree, degreeAOA, deviceX, deviceY) {
    const r = d / 100;
    const radian = ((-degreeAOA + directionDegree) * Math.PI) / 180;
    let newX = r * Math.cos(radian);
    let newY = r * Math.sin(radian);
    newX += deviceX;
    newY += deviceY;
    return [newX, newY];
  }

  // initial load
  loadWorker(modelBuilder) {
    if (modelBuilder) {
      // this.newModel.addNewWorker(
      //   modelBuilder,
      //   parseInt(4210000000000195),
      //   0,
      //   0
      // );
      // this.newModel.addWorkerTag(modelBuilder, parseInt(1), 0, 0);
      this.newModel.addBeacon(
        modelBuilder,
        parseInt(1),
        this.deviceX,
        this.deviceY
      );

      this.newModel.addRestrictedArea(
        modelBuilder,
        parseInt(776),
        this.positionRestrictedArea_X,
        this.positionRestrictedArea_Y
      );
      this.newModel.addExcavator(
        modelBuilder,
        parseInt(1234),
        this.positionExcavator_X,
        this.positionRestrictedArea_Y
      );
    }
  }

  async loadPlantModel() {
    await this.viewer.loadModel(
      `${CDN_DOMAIN}/assets/models/excavator.gltf`,
      {},
      (plant) => {
        this.plant = plant;
      }
    );
  }

  async loadWorkerModel() {
    await this.viewer.loadModel(
      `${CDN_DOMAIN}/assets/models/human.gltf`,
      {},
      (human) => {
        this.human = human;
      }
    );
  }

  workerPosition(datas) {
    if (datas) {
      const position = this.calculateUWBPosition(
        datas.distance,
        this.angle,
        datas.degree,
        this.deviceX,
        this.deviceY
      );

      // mapbox
      const positionIndoor = this.calculateLatLong(
        this.centerLat,
        this.centerLong,
        position[0],
        position[1]
      );
      // mapbox dasloop
      this.updateDasloopPosition(positionIndoor);

      const tr = this.plant.getPlacementTransform();

      // const excavator = this.newModel.objects[1234];

      // const initialPosition = new THREE.Vector3();
      // const positionOfExcavator = initialPosition.setFromMatrixPosition(
      //   excavator.matrixWorld
      // );
      const finalPosition = this.calculateLatLong(
        this.centerLat,
        this.centerLong,
        tr.elements[12],
        tr.elements[13]
      );
      this.updateExcavatorPosition(finalPosition);

      this.setValueDetails(
        datas.degree,
        datas.distance,
        position,
        positionIndoor[0],
        positionIndoor[1]
      );

      this.newModel.changePositionSpecific(
        this.modelBuilder,
        datas.tagId,
        position[0],
        position[1]
      );

      console.log(this.human);
      if (this.human) {
        this.human.setPlacementTransform(
          new THREE.Matrix4().setPosition({
            x: position[0],
            y: position[1],
            z: 0,
          })
        );
      }
    }
  }

  multiplyMatrix = (a, b) => {
    const aNumRows = a.length;
    const aNumCols = a[0].length;
    const bNumCols = b[0].length;
    const m = new Array(aNumRows);
    for (let r = 0; r < aNumRows; r += 1) {
      m[r] = new Array(bNumCols);
      for (let c = 0; c < bNumCols; c += 1) {
        m[r][c] = 0;
        for (let i = 0; i < aNumCols; i += 1) {
          m[r][c] += a[r][i] * b[i][c];
        }
      }
    }
    return m;
  };
  getRotatedPosition = (
    x,
    z,
    boxCenterPositionX,
    boxCenterPositionZ,
    angle
  ) => {
    let coordinates = [x, z, [1, 1, 1, 1]];
    const translateToOrigin = [
      [1, 0, -boxCenterPositionX],
      [0, 1, -boxCenterPositionZ],
      [0, 0, 1],
    ];
    const radians = angle * (Math.PI / 180);
    const rotate = [
      [Math.cos(radians), -Math.sin(radians), 0],
      [Math.sin(radians), Math.cos(radians), 0],
      [0, 0, 1],
    ];
    const translateToOriginalPos = [
      [1, 0, boxCenterPositionX],
      [0, 1, boxCenterPositionZ],
      [0, 0, 1],
    ];
    const toOrigin = this.multiplyMatrix(translateToOriginalPos, rotate);
    const allTransform = this.multiplyMatrix(toOrigin, translateToOrigin);
    coordinates = this.multiplyMatrix(allTransform, coordinates);
    const xCoordinates = coordinates[0];
    const yCoordinates = coordinates[1];
    return [xCoordinates, yCoordinates];
  };

  getBoxPositionEveryCorner(
    centerLat,
    centerLong,
    rest_area_X,
    rest_area_Y,
    rest_area_size_X,
    rest_area_size_Y,
    angle
  ) {
    let newCoordinatesEveryCorner = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];

    const boxCenterX = rest_area_X;
    const boxCenterZ = rest_area_Y;
    const sizeX = rest_area_size_X * 2;
    const sizeZ = rest_area_size_Y * 2;

    // get position every corner (for rectangle)
    const pointsX = [
      boxCenterX - sizeX / 2,
      boxCenterX - sizeX / 2,
      boxCenterX + sizeX / 2,
      boxCenterX + sizeX / 2,
    ];
    const pointsZ = [
      boxCenterZ + sizeZ / 2,
      boxCenterZ - sizeZ / 2,
      boxCenterZ - sizeZ / 2,
      boxCenterZ + sizeZ / 2,
    ];
    const positionEveryCorner = this.getRotatedPosition(
      pointsX,
      pointsZ,
      boxCenterX,
      boxCenterZ,
      angle
    );

    newCoordinatesEveryCorner = this.toLatitudeLongitude(
      centerLat,
      centerLong,
      positionEveryCorner
    );

    return newCoordinatesEveryCorner;
  }

  setNewWorker() {
    let buttonCreate = document.createElement("div");
    buttonCreate.innerText = "New Create Model";
    buttonCreate.classList.add("button-bee");
    buttonCreate.addEventListener("click", async () => {
      if (
        !isNaN(this.inputValueDbId) &&
        this.inputValueDbId !== "" &&
        this.inputValueDbId !== null
      ) {
        this.newModel.addNewWorker(
          this.modelBuilder,
          parseInt(this.inputValueDbId)
        );
      } else {
        alert("Please input a number !");
        return false;
      }
    });
    this.container.append(buttonCreate);
  }

  setNewRestrictedArea() {
    let buttonCreate = document.createElement("div");
    buttonCreate.innerText = "New Restricted Area";
    buttonCreate.classList.add("button-bee");
    buttonCreate.addEventListener("click", async () => {
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      // const x = -10;
      // const y = 0;
      if (
        !isNaN(this.inputValueDbId) &&
        this.inputValueDbId !== "" &&
        this.inputValueDbId !== null
      ) {
        this.newModel.addRestrictedArea(
          this.modelBuilder,
          parseInt(this.inputValueDbId),
          x,
          y
        );
      } else {
        alert("Please input a number of dbId!");
        return false;
      }
    });
    this.container.append(buttonCreate);
  }

  setNewBeacon() {
    let buttonCreate = document.createElement("div");
    buttonCreate.innerText = "New Beacon";
    buttonCreate.classList.add("button-bee");
    buttonCreate.addEventListener("click", async () => {
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      // const x = -20;
      // const y = 0;
      if (
        !isNaN(this.inputValueDbId) &&
        this.inputValueDbId !== "" &&
        this.inputValueDbId !== null
      ) {
        this.newModel.addBeacon(
          this.modelBuilder,
          parseInt(this.inputValueDbId),
          x,
          y
        );
      } else {
        alert("Please input a number of dbId!");
        return false;
      }
    });
    this.container.append(buttonCreate);
  }

  setNewPlant() {
    let buttonCreate = document.createElement("div");
    buttonCreate.innerText = "New Plant";
    buttonCreate.classList.add("button-bee");
    buttonCreate.addEventListener("click", async () => {
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      // const x = -30;
      // const y = 0;
      if (
        !isNaN(this.inputValueDbId) &&
        this.inputValueDbId !== "" &&
        this.inputValueDbId !== null
      ) {
        this.newModel.addExcavator(
          this.modelBuilder,
          parseInt(this.inputValueDbId),
          x,
          y
        );
      } else {
        alert("Please input a number of dbId!");
        return false;
      }
    });
    this.container.append(buttonCreate);
  }

  setZoomToModel() {
    let buttonZoom = document.createElement("div");
    buttonZoom.innerText = "Create Zoom To";
    buttonZoom.classList.add("button-bee");
    buttonZoom.addEventListener("click", () => {
      if (
        !isNaN(this.inputValueDbId) &&
        this.inputValueDbId !== "" &&
        this.inputValueDbId !== null
      ) {
        this.newModel.setFlyTo(
          this.modelBuilder,
          parseInt(this.inputValueDbId)
        );
      } else {
        alert("Please input a number of dbId");
      }
    });
    this.container.append(buttonZoom);
  }

  createInput() {
    this.input = document.createElement("input");
    this.input.setAttribute("value", 1234);
    this.input.addEventListener("input", (e) => {
      this.inputValueDbId = e.target.value;
    });
    this.container.append(this.input);
  }

  setVisibility() {
    let buttonVisibility = document.createElement("div");
    buttonVisibility.innerText = "Visibility";
    buttonVisibility.classList.add("button-bee");
    buttonVisibility.addEventListener("click", async () => {
      this.enabled = !this.enabled;
      if (this.enabled) {
        const instanceTree = this.viewer.model.getData().instanceTree;
        const rootId = instanceTree.getRootId();
        this.viewer.hide(rootId);
      } else {
        const instanceTree = this.viewer.model.getData().instanceTree;
        const rootId = instanceTree.getRootId();
        this.viewer.show(rootId);
      }
    });
    this.container.append(buttonVisibility);
  }

  setUpForm() {
    const form = document.createElement("form");
    form.setAttribute("id", "myform");
    const inputPosX = document.createElement("input");
    const inputPosY = document.createElement("input");
    const inputPosZ = document.createElement("input");
    inputPosX.setAttribute("name", "x");
    inputPosY.setAttribute("name", "y");
    inputPosZ.setAttribute("name", "z");
    const submit = document.createElement("input");
    submit.setAttribute("type", "submit");
    submit.innerText = "submit_position";
    form.append(inputPosX, inputPosY, inputPosZ, submit);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueX = parseInt(form.elements.namedItem("x").value);
      this.valueY = parseInt(form.elements.namedItem("y").value);
      this.valueZ = parseInt(form.elements.namedItem("z").value);

      if (this.inputValueDbId) {
        this.newModel.changePositionSpecific(
          this.modelBuilder,
          this.inputValueDbId,
          this.valueX,
          this.valueY,
          this.valueZ
        );
      }
    });
    this.container.append(form);
  }

  setMapbox() {
    const latshowvalue = document.createElement("input");
    const longshowvalue = document.createElement("input");
    latshowvalue.setAttribute("placeholder", "Latitude");
    longshowvalue.setAttribute("placeholder", "Longitude");
    const containerLatLong = document.createElement("div");
    containerLatLong.setAttribute("class", "containerLatLong");
    const positionX = document.createElement("input");
    const positionY = document.createElement("input");
    const positionZ = document.createElement("input");
    positionX.setAttribute("placeholder", "x");
    positionY.setAttribute("placeholder", "y");
    positionZ.setAttribute("placeholder", "z");
    containerLatLong.append(
      latshowvalue,
      longshowvalue,
      positionX,
      positionY,
      positionZ
    );

    this.container.append(containerLatLong);

    this.map.on("click", (e) => {
      const longitudeByClick = e.lngLat.lng;
      const latitudeByClick = e.lngLat.lat;

      latshowvalue.value = latitudeByClick;
      longshowvalue.value = longitudeByClick;

      const pos = this.coordinateConverter.geographicToCartesian(
        latitudeByClick,
        longitudeByClick
      );
      positionX.value = pos.x;
      positionY.value = pos.y;

      if (this.plant) {
        this.plant.setPlacementTransform(
          new THREE.Matrix4().setPosition({
            x: pos.x,
            y: pos.y,
            z: 0,
          })
        );
      }

      // this.newModel.changePositionSpecific(
      //   this.modelBuilder,
      //   parseInt(1234),
      //   pos.x,
      //   pos.y
      // );
    });
  }
  toLatitudeLongitude(centerLat, centerLong, positionEveryCorner) {
    const newCoordinatesAfterRotate = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];

    for (let i = 0; i < positionEveryCorner[0].length; i += 1) {
      newCoordinatesAfterRotate[i] = this.calculateLatLong(
        centerLat,
        centerLong,
        positionEveryCorner[0][i],
        positionEveryCorner[1][i]
      );
    }
    return newCoordinatesAfterRotate;
  }

  calculateLatLong = (lat, long, x, y) => {
    const rEarth = 6378;
    const pi = Math.PI;
    const xPos = x / 1000;
    const yPos = y / 1000;

    const newLat = lat + (yPos / rEarth) * (180 / pi);
    const newLong =
      long + ((xPos / rEarth) * (180 / pi)) / Math.cos((lat * pi) / 180);
    return [newLong, newLat];
  };

  setCoordinateBuilding = () => {
    const newCoordinatesAfterRotate = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    for (let i = 0; i < this.BUILDING_CORNER_LOCATION.length; i += 1) {
      newCoordinatesAfterRotate[i] = this.calculateLatLong(
        this.centerLat,
        this.centerLong,
        this.BUILDING_CORNER_LOCATION[i][0],
        this.BUILDING_CORNER_LOCATION[i][1]
      );
    }

    return newCoordinatesAfterRotate;
  };

  setInfoDetails() {
    const info = document.createElement("div");
    this.infoDegree = document.createElement("input");
    this.infoDistance = document.createElement("input");
    this.infoWorkerPosition = document.createElement("input");
    this.long = document.createElement("input");
    this.lat = document.createElement("input");
    info.append(
      this.infoDegree,
      this.infoDistance,
      this.infoWorkerPosition,
      this.long,
      this.lat
    );
    this.container.append(info);
  }

  setValueDetails(degree, distance, workerposition, long, lat) {
    this.infoDegree.value = parseFloat(degree).toFixed(2);
    this.infoDistance.value = distance;
    this.infoWorkerPosition.value = `(${parseFloat(workerposition[0]).toFixed(
      2
    )}, ${parseFloat(workerposition[1]).toFixed(2)})`;
    this.long.value = long;
    this.lat.value = lat;
  }

  setDasloop() {
    this.map.on("load", () => {
      // Load an image from an external URL.
      Promise.all(
        this.iconMapbox.map(
          (img) =>
            new Promise((resolve, reject) => {
              this.map.loadImage(img.url, (error, res) => {
                if (error) {
                  console.log(`Error with ${img.id}`);
                  console.error(error);
                  reject(error);
                } else {
                  resolve([img, res]);
                }
              });
            })
        )
      ).then((icons) => {
        icons.forEach((icon_data) => {
          const icon = icon_data[0];
          const data = icon_data[1];

          if (data) this.map.addImage(icon.id, data);

          this.map.addSource(icon.id, {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [icon.longLat[0], icon.longLat[1]],
                  },
                  properties: {},
                },
              ],
            },
          });

          // Add a layer to use the image to represent the data.
          this.map.addLayer({
            id: icon.id,
            type: "symbol",
            source: icon.id, // reference the data source
            layout: {
              "icon-image": icon.id, // reference the image
              "icon-size": 0.1,
              "icon-offset": [0, -150],
              "icon-allow-overlap": true,
            },
          });
        });
      });
    });
  }

  updateDasloopPosition(dasloopLatLong) {
    if (dasloopLatLong) {
      const data = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [dasloopLatLong[0], dasloopLatLong[1]],
            },
            properties: {},
          },
        ],
      };

      const source = this.map.getSource("worker");
      if (source) {
        source.setData(data);
      }
    }
  }

  updateExcavatorPosition(excavatorLatLong) {
    if (excavatorLatLong) {
      const excavatorData = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [excavatorLatLong[0], excavatorLatLong[1]],
            },
            properties: {},
          },
        ],
      };

      const sourceExcavator = this.map.getSource("excavator");
      if (sourceExcavator) {
        sourceExcavator.setData(excavatorData);
      }
    }
  }

  // draw line
  setDrawLine() {
    this.map.on("load", () => {
      const newCoordinates = this.setCoordinateBuilding();
      this.map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              ...newCoordinates.map((coord) => {
                return coord;
              }),
              newCoordinates[0],
            ],
          },
        },
      });
      this.map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#ff0000",
          "line-width": 4,
        },
      });

      const restrictedAreaLine = this.getBoxPositionEveryCorner(
        this.centerLat,
        this.centerLong,
        this.positionRestrictedArea_X,
        this.positionRestrictedArea_Y,
        this.restricAreaSize_X,
        this.restricAreaSize_Y,
        0
      );
      this.map.addSource("route2", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              ...restrictedAreaLine.map((coord) => {
                return coord;
              }),
              restrictedAreaLine[0],
            ],
          },
        },
      });
      this.map.addLayer({
        id: "route2",
        type: "line",
        source: "route2",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#ff0000",
          "line-width": 4,
        },
      });
    });
  }

  lookAtMe() {
    let buttonLook = document.createElement("div");
    buttonLook.classList.add("button-bee");
    buttonLook.innerText = "Change Scale";
    buttonLook.addEventListener("click", () => {
      this.newModel.restrictedAreaScale(
        parseInt(776),
        this.modelBuilder,
        this.restricAreaSize_X,
        this.restricAreaSize_Y
      );
    });
    this.container.append(buttonLook);
  }

  toForgeCoordinate({ x, y }) {
    return {
      x: x,
      y: y,
    };
  }
}
