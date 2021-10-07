// import { distance } from "./lib/CoordinateConverter";
import "./css/main.css";

/* global Autodesk THREE mapboxgl GLTFLoader */

class BeeInventor extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.viewer = viewer;
    this.options = options;
    this._button = null;
    this._group = null;
    this.panel = null;
    this.grid = null;
  }

  load() {
    console.log("Docking Panel has been loaded !");
    this.grid = new THREE.GridHelper(50, 1);
    this.grid.material.opacity = 0.8;
    this.grid.material.transparent = true;
    this.grid.position.set(0, 0, 0);
    this.grid.rotateX(Math.PI / 2);
    if (!this.viewer.overlays.hasScene("grid")) {
      this.viewer.overlays.addScene("grid");
    }
    this.viewer.overlays.addMesh(this.grid, "grid");
    return true;
  }

  unload() {
    console.log("Docking Panel has been unloaded !");
    if (this.viewer.toolbar !== null)
      this.viewer.toolbar.removeControl(this.subToolbar);
    if (this.panel !== null) this.panel.setVisible(false);
    if (this._group) {
      this._group.removeControl(this._button);
      if (this._group.getNumberOfControls() === 0) {
        this.viewer.toolbar.removeControl(this._group);
      }
    }
    return true;
  }

  onToolbarCreated() {
    this._group = this.viewer.toolbar.getControl("BeeInventorToolbar");
    if (!this._group) {
      this._group = new Autodesk.Viewing.UI.ControlGroup("BeeInventorToolbar");
      this.viewer.toolbar.addControl(this._group);
    }
    this._button = new Autodesk.Viewing.UI.Button("Docking Panel");
    this._button.onClick = () => {
      if (this.panel === null) {
        this.panel = new CustomPanel(
          this.viewer,
          this.viewer.container,
          "beeInventor",
          "My Custom Extension"
        );
      }
      // const panel = new CustomPanel();
      // console.log(panel.map);
      this.panel.setVisible(!this.panel.isVisible());
    };
    this._button.setToolTip("Docking Panel");
    this._button.addClass("dockingPanel");
    this._group.addControl(this._button);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  "BeeInventor",
  BeeInventor
);

class CustomPanel extends Autodesk.Viewing.UI.DockingPanel {
  constructor(viewer, container, id, title, options) {
    super(container, id, title, options);
    this.viewer = viewer;
    this.options = options;
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
    this.humanModel1 = null;
    this.excavator1 = null;
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

    this.newModel = new Model(this.viewer, this.options);

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
    this.loadGLTFModel();
    // this.getDataUWB();
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
      this.newModel.addNewWorker(
        modelBuilder,
        parseInt(4210000000000195),
        0,
        0
      );
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

  async loadGLTFModel() {
    await this.viewer.loadExtension("Autodesk.glTF");

    await this.viewer.loadModel(
      "/assets/models/excavator8.gltf",
      {},
      (model) => {
        console.log(model);
        this.excavator1 = model;
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

      const tr = this.excavator1.getPlacementTransform();
      console.log(tr.elements[12]);
      console.log(tr.elements[13]);
      console.log(tr.elements[14]);

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

      // if (this.humanModel1) {
      //   this.humanModel1.setPlacementTransform(
      //     new THREE.Matrix4().setPosition({
      //       x: position[0],
      //       y: position[1],
      //       z: 0,
      //     })
      //   );
      // }
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

      const pos = this.geographicToCartesian(
        this.centerLat,
        this.centerLong,
        latitudeByClick,
        longitudeByClick
      );
      positionX.value = pos.x;
      positionY.value = pos.y;

      if (this.excavator1) {
        this.excavator1.setPlacementTransform(
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

  geographicToCartesian = (
    latitudeCenter,
    longitudeCenter,
    latitude,
    longitude
  ) => {
    let distanceX = distance(
      latitudeCenter,
      longitudeCenter,
      latitudeCenter,
      longitude
    );
    let distanceY = distance(
      latitudeCenter,
      longitudeCenter,
      latitude,
      longitudeCenter
    );

    if (longitudeCenter * longitude > 0) {
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
    return this.toForgeCoordinate({ x: distanceX, y: distanceY });
  };

  distance = (lat1, long1, lat2, long2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((long2 - long1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
  };
}

class Model {
  constructor(viewer, options) {
    this.viewer = viewer;
    this.options = options;
    this.position = null;
    this.workerId = null;
    this.model = null;
    this.humanModel = null;
    this.restrictedArea = null;
    this.beacon = null;
    this.excavator = null;
    this.objects = {};
  }

  addWorker(modelBuilder, dbId, x = 0, y = 0, z = 3) {
    let modelGeometry = new THREE.Geometry();
    const globalMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const texture = THREE.ImageUtils.loadTexture(
      `${CDN_DOMAIN}/assets/images/png/img_gps_dasloop_online.png`
    );
    texture.minFilter = THREE.LinearFilter;
    const workerMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const planeGeometry = new THREE.PlaneGeometry(1, 1);
    const textGeometry = new THREE.TextGeometry(`${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });
    textGeometry.computeBoundingBox();

    const workerIdMesh = new THREE.Mesh(textGeometry, globalMaterial);
    const workerMesh = new THREE.Mesh(planeGeometry, workerMaterial);

    // Setup Human Position
    workerIdMesh.matrix.setPosition(new THREE.Vector3(-1.5, 0.7, 0));
    workerIdMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));

    // Merging
    modelGeometry.merge(workerMesh.geometry, workerMesh.matrix);
    modelGeometry.merge(workerIdMesh.geometry, workerIdMesh.matrix);
    modelGeometry.computeVertexNormals();
    const workerBufferGeometry = new THREE.BufferGeometry().fromGeometry(
      modelGeometry
    );
    this.humanModel = new THREE.Mesh(workerBufferGeometry, workerMaterial);
    this.humanModel.matrix.setPosition(new THREE.Vector3(x, y, z));

    // Add to object userData
    this.humanModel.userData.id = dbId;
    this.objects[this.humanModel.userData.id] = this.humanModel;
    this.humanModel.dbId = dbId;
    modelBuilder.addMesh(this.humanModel);
  }

  addNewWorker(modelBuilder, dbId, x = 0, y = 0, z = 1) {
    let modelGeometry = new THREE.Geometry();
    const globalMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const head = new THREE.SphereGeometry(0.4, 32, 16);
    const body = new THREE.SphereGeometry(0.3, 32, 16);
    const textGeometry = new THREE.TextGeometry(`${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });

    const humanIdMesh = new THREE.Mesh(textGeometry, globalMaterial);
    humanIdMesh.matrix.setPosition(new THREE.Vector3(0, 0, 1.3));
    humanIdMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));
    const headMesh = new THREE.Mesh(head, globalMaterial);
    const bodyMesh = new THREE.Mesh(body, globalMaterial);

    headMesh.matrix.setPosition(new THREE.Vector3(0, 0, 1));

    headMesh.matrix.scale(new THREE.Vector3(0.5, 0.5, 0.5));
    bodyMesh.matrix.scale(new THREE.Vector3(0.5, 0.5, 2.5));
    modelGeometry.merge(headMesh.geometry, headMesh.matrix);
    modelGeometry.merge(bodyMesh.geometry, bodyMesh.matrix);
    modelGeometry.merge(humanIdMesh.geometry, humanIdMesh.matrix);
    modelGeometry.computeVertexNormals();
    const humanModel = new THREE.BufferGeometry().fromGeometry(modelGeometry);
    this.humanModel = new THREE.Mesh(humanModel, globalMaterial);
    this.humanModel.matrix.setPosition(new THREE.Vector3(x, y, z));
    this.humanModel.userData.id = dbId;
    this.objects[this.humanModel.userData.id] = this.humanModel;
    this.humanModel.dbId = dbId;
    modelBuilder.addMesh(this.humanModel);
    this.model = this.modelBuilder;
  }

  addRestrictedArea(modelBuilder, dbId, x = 0, y = 0, z = 2) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const globalMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const textGeometry = new THREE.TextGeometry(`${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });

    let restricted = new THREE.Geometry();
    const boxMesh = new THREE.Mesh(box, globalMaterial);
    const textMesh = new THREE.Mesh(textGeometry, globalMaterial);
    textMesh.matrix.setPosition(new THREE.Vector3(0, 0.5, 0));
    textMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));
    boxMesh.matrix.scale(new THREE.Vector3(1, 1, 1));

    restricted.merge(boxMesh.geometry, boxMesh.matrix);
    restricted.merge(textMesh.geometry, textMesh.matrix);
    restricted.computeVertexNormals();
    const restrictedGeo = new THREE.BufferGeometry().fromGeometry(restricted);
    this.restrictedArea = new THREE.Mesh(restrictedGeo, globalMaterial);

    this.restrictedArea.matrix.setPosition(new THREE.Vector3(x, y, z));
    // Add to object userData
    this.restrictedArea.userData.id = dbId;
    this.objects[this.restrictedArea.userData.id] = this.restrictedArea;
    this.restrictedArea.dbId = dbId;
    modelBuilder.addMesh(this.restrictedArea);
  }

  addExcavator(modelBuilder, dbId, x = 0, y = 0, z = 1) {
    const globalMaterial = new THREE.MeshBasicMaterial({ color: "#ff9500" });
    const texture = THREE.ImageUtils.loadTexture(
      `${CDN_DOMAIN}/assets/images/png/img_gps_plant_online-3.png`
    );
    texture.minFilter = THREE.LinearFilter;
    const excavatorMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const textGeometry = new THREE.TextGeometry(`${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });
    textGeometry.computeBoundingBox();

    const textMesh = new THREE.Mesh(textGeometry, globalMaterial);
    const excavatorMesh = new THREE.Mesh(boxGeometry, globalMaterial);
    excavatorMesh.matrix.scale(new THREE.Vector3(2, 2, 1));
    textMesh.matrix.setPosition(new THREE.Vector3(0, 1, 0));
    textMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));
    let excavatorGeo = new THREE.Geometry();

    excavatorGeo.merge(textMesh.geometry, textMesh.matrix);
    excavatorGeo.merge(excavatorMesh.geometry, excavatorMesh.matrix);
    excavatorGeo.computeVertexNormals();

    const excavatorBuffer = new THREE.BufferGeometry().fromGeometry(
      excavatorGeo
    );
    this.excavator = new THREE.Mesh(excavatorBuffer, excavatorMaterial);

    this.excavator.matrix.setPosition(new THREE.Vector3(x, y, z));

    // Add to object userData
    this.excavator.userData.id = dbId;
    this.objects[this.excavator.userData.id] = this.excavator;

    this.excavator.dbId = dbId;
    modelBuilder.addMesh(this.excavator);
  }

  addBeacon(modelBuilder, dbId, x = 0, y = 0, z = 1) {
    const sphere = new THREE.SphereGeometry(0.3, 32, 16);
    const globalMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const textGeometry = new THREE.TextGeometry(`${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });
    const textMesh = new THREE.Mesh(textGeometry, globalMaterial);
    const beaconMesh = new THREE.Mesh(sphere, globalMaterial);
    // Setup Human Position
    textMesh.matrix.setPosition(new THREE.Vector3(0, 0.5, 0));
    textMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));
    let beaconGeo = new THREE.Geometry();
    beaconGeo.merge(textMesh.geometry, textMesh.matrix);
    beaconGeo.merge(beaconMesh.geometry, beaconMesh.matrix);
    beaconGeo.computeVertexNormals();

    const beaconBuffer = new THREE.BufferGeometry().fromGeometry(beaconGeo);
    this.beacon = new THREE.Mesh(beaconBuffer, globalMaterial);
    this.beacon.matrix.setPosition(new THREE.Vector3(x, y, z));

    // Add to object userData
    this.beacon.userData.id = dbId;
    this.objects[this.beacon.userData.id] = this.beacon;

    this.beacon.dbId = dbId;
    modelBuilder.addMesh(this.beacon);
  }

  setFlyTo(modelBuilder, dbId) {
    this.viewer.select([dbId], modelBuilder.model);
    this.viewer.utilities.fitToView();
  }

  changePosition(modelBuilder, mesh, x, y, z) {
    console.log(mesh);
    mesh.matrix.setPosition(new THREE.Vector3(x, y, z));
    modelBuilder.updateMesh(mesh);
  }

  changePositionSpecific(modelBuilder, dbId, x = 0, y = 0, z = 1) {
    if (this.objects[dbId]) {
      this.objects[dbId].matrix.setPosition(new THREE.Vector3(x, y, z));
      modelBuilder.updateMesh(this.objects[dbId]);
    } else {
      console.log("there is no object on this scene !");
    }
  }

  restrictedAreaScale(dbId, modelBuilder, size_X, size_Y) {
    if (this.objects[dbId]) {
      this.objects[dbId].matrix.scale(new THREE.Vector3(size_X, size_Y, 1));
      modelBuilder.updateMesh(this.objects[dbId]);
      // const position = new THREE.Vector3();
      // const scale = position.setFromMatrixScale(this.objects[dbId].matrixWorld);
    } else {
      console.log("there is no object on this scene !");
    }
  }

  lookAtMe(modelBuilder, dbId) {
    // this.objects[dbId].lookAt(this.viewer.getCamera().clone().position);
    // console.log(this.objects[dbId].matrix.makeRotationFromQuaternion());
    console.log(modelBuilder);

    this.objects[dbId].matrix.makeRotationFromQuaternion(
      this.viewer.getCamera().clone().quaternion
    );
    modelBuilder.updateMesh(this.objects[dbId]);
  }
}
