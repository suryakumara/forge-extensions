/* mapboxgl */
import { BeeInventorModel } from "./BeeInventorModel";
import { CoordinateConverter } from "./CoordinateConverter";
import { ForgeController } from "./ForgeController";
import { EditableGeoJsonLayer } from "@nebula.gl/layers";
import { DrawPolygonMode } from "@nebula.gl/edit-modes";
import { Deck } from "@deck.gl/core";
import { DarkMode } from "./ui-tools/DarkMode";
import { TransformToolUI } from "./ui-tools/TransformToolUI";

export class BeeInventorPanel extends Autodesk.Viewing.UI.DockingPanel {
  constructor(viewer, container, id, title, options) {
    super(container, id, title, options);
    this.viewer = viewer;
    this.options = options;
    // docking panel
    this.container.classList.add("docking-panel-container-solid-color-a");
    this.container.style.cssText = `
      top: 10px;
      left: 10px;
      width: auto;
      padding: 10px;
      height: 500px;
      resize: auto;
    `;

    this.containerBuilding = document.createElement("div");
    this.containerBuilding.className = "containerBuilding";
    this.container.append(this.containerBuilding);

    this.containerInfo = document.createElement("div");
    this.containerInfo.className = "containerInfo";
    this.containerInfo.style.cssText = `
    margin-top: 1rem;
    padding: 0 0.2rem;
    border: 0.5px solid #E5A600;
  `;
    this.container.append(this.containerInfo);

    this.containerUWB = document.createElement("div");
    this.containerUWB.className = "containerUWB";
    this.container.append(this.containerUWB);

    this.containerGeneralTool = document.createElement("div");
    this.containerGeneralTool.className = "generalTool";
    this.container.append(this.containerGeneralTool);

    this.sceneBuilder = null;
    this.modelBuilder = null;

    this.infoId = null;
    this.infoPosition = null;
    this.infoRotation = null;
    this.infoLatitude = null;
    this.infoLongitude = null;
    this.started = false;
    this.selectedModel = null;
    this.selectedModelRotation = null;
    this.transformControlTx = null;
    this.isDragging = false;

    this.enabledIcon = false;

    this.aoa = {
      id: "4219",
      position: [0, 0, 2],
      rotation: [0, 0, 0],
    };
    this.resA = {
      id: "12312",
      position: [0, 10, 0],
      rotation: [0, 0, 0],
    };
    this.viewerContainer = document.querySelector(
      `#${this.viewer.clientContainer.id}`
    );

    // modelBuilder for custom Autodesk Forge
    this.viewer
      .loadExtension("Autodesk.Viewing.SceneBuilder")
      .then((builder) => {
        this.sceneBuilder = builder;
        return this.sceneBuilder.addNewModel({
          modelNameOverride: "BeeModel",
          conserveMemory: false,
        });
      })
      .then((builder) => {
        this.modelBuilder = builder;

        console.log("modelBuilder Created.");
      });

    this.onSelection = this.onSelection.bind(this);
    this.viewer.addEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this.onSelection
    );

    document.onmousemove = (event) => {
      if (event.ctrlKey) {
        const viewerContainer = document.querySelector(
          `#${this.viewer.clientContainer.id}`
        );
        const containerSize = viewerContainer.getBoundingClientRect();

        let res = this.viewer.impl.hitTest(
          event.clientX - containerSize.left,
          event.clientY - containerSize.top,
          true,
          null,
          [this.viewer.model.getModelId()]
        );
        let pt = null;

        if (res) {
          pt = res.intersectPoint;
        } else {
          pt = viewer.impl.intersectGround(
            event.clientX - containerSize.left,
            event.clientY - containerSize.top
          );
        }

        let tr = this.selectedModel.getPlacementTransform();
        tr.elements[12] = pt.x;
        tr.elements[13] = pt.y;
        tr.elements[14] = pt.z;
        this.selectedModel.setPlacementTransform(tr);
        this.viewer.impl.invalidate(true, true, true);
      }
    };

    this.beeController = new BeeInventorModel(this.viewer, this.options);
    this.Controller = new ForgeController(this.viewer, this.options);
    this.coordinateConverter = new CoordinateConverter(
      25.069771049083982,
      121.52045303099948
    );
    this.markerMap = new Map();
    this.socket = io("http://localhost:3333");

    // mapbox
    this.containerMapbox = document.createElement("div");
    this.containerMapbox.setAttribute("id", "map");

    this.viewerContainer.append(this.containerMapbox);

    mapboxgl.accessToken =
      "pk.eyJ1IjoiYmVlaW52ZW50b3IiLCJhIjoiY2p1anFjbTY0MW9hMDRlcDRzMW9tcHJ1OSJ9.9WIfYAKd10XIdwWpB9EZFQ";
    this.map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [121.52045303099948, 25.069771049083982],
    });
    this.map.zoomTo(19.5);

    this.centralMarker = new mapboxgl.Marker();
    this.centralMarker
      .setLngLat([121.52045303099948, 25.069771049083982])
      .addTo(this.map);

    // deckgl
    this.containerDeckGl = document.createElement("canvas");
    this.containerDeckGl.setAttribute("id", "deck");
    const w = this.containerDeckGl.offsetWidth;
    const h = this.containerDeckGl.offsetHeight;

    this.viewerContainer.append(this.containerDeckGl);

    const layers = this.getLayers();
    const editableGeoJsonLayer = layers[0];
    const INITIAL_VIEW_STATE = {
      latitude: 25.069771049083982,
      longitude: 121.52045303099948,
      zoom: 15,
      bearing: 0,
      pitch: 0,
    };

    this.deck = new Deck({
      initialViewState: INITIAL_VIEW_STATE,
      canvas: "deck",
      width: 300,
      height: 300,
      layers: layers,
      controller: {
        doubleClickZoom: false,
      },
      getCursor: editableGeoJsonLayer.getCursor.bind(editableGeoJsonLayer),
    });

    this.load();
    this.init();
    this.initModel();
    this.getDataUWB();
    this.updateBuildingPosition();
    this.updateLatLong();
    this.setVisibility();
    this.updateInfoObject();
    this.setUpAOA();
    const transformTool = new TransformToolUI(
      this.viewer,
      this.containerGeneralTool
    );
    transformTool.transformToolSetup();
    const darkMode = new DarkMode(this.viewer, this.containerGeneralTool);
    darkMode.darkModeToolSetup();
  }

  getLayers() {
    const COUNTRIES =
      "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_scale_rank.geojson"; //eslint-disable-line
    let myFeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    const layers = [
      new EditableGeoJsonLayer({
        id: "nebula",
        data: myFeatureCollection,
        selectedFeatureIndexes: [],
        mode: DrawPolygonMode,

        // Styles
        filled: true,
        pointRadiusMinPixels: 2,
        pointRadiusScale: 2000,
        extruded: true,
        getElevation: 1000,
        getFillColor: [200, 0, 80, 180],

        // Interactive props
        pickable: true,
        autoHighlight: true,

        onEdit: ({ updatedData }) => {
          myFeatureCollection = updatedData;
          this.deck.setProps({ layers: this.getLayers() });
          const features = myFeatureCollection.features[0];

          if (features) {
            console.log("yahoooo");
            console.log(this.getLayers()[0]);
            const resCust = {
              id: "E143231A43sdfds",
              geoLocation: [...features.geometry.coordinates[0]],
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
        },
      }),
    ];

    return layers;
  }

  onSelection(event) {
    const selSet = event.selections;
    const firstSel = selSet[0];
    if (this.infoCard) {
      this.infoCard.remove();
    }

    if (firstSel) {
      const listdbIds = firstSel.dbIdArray;
      const dbidItem = listdbIds[0];
      const typeModel = dbidItem.toString().slice(0, 3);
      if (typeModel !== "500") return;

      const model = firstSel.model;
      this.selectedModel = model;

      let translation = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        scale = new THREE.Vector3();
      model.getPlacementTransform().decompose(translation, rotation, scale);
      const rotatedMatrix = model.getPlacementTransform();

      const rotationValueZ = this.getRotationModel(rotatedMatrix);
      this.selectedModelRotation = rotationValueZ;

      let dbIds = firstSel.dbIdArray;
      let firstDbId = dbIds[0];

      const instanceTree = model.getData().instanceTree;
      const fragList = model.getFragmentList();
      let bounds = new THREE.Box3();
      instanceTree.enumNodeFragments(
        firstDbId,
        (fragId) => {
          let box = new THREE.Box3();
          fragList.getWorldBounds(fragId, box);
          bounds.union(box);
        },
        true
      );

      this.posModel = bounds.getCenter();
      this.enabled = true;

      const positionGeo = this.coordinateConverter.cartesianToGeographic(
        this.posModel.x,
        this.posModel.y
      );
      const idModel = this.getTypeOfModel(firstDbId.toString());

      const objectInfo = {
        id: idModel.idDevice,
        position: `${Math.floor(this.posModel.x)},${Math.floor(
          this.posModel.y
        )},${Math.floor(this.posModel.z)}`,
        rotation: `${Math.floor(rotationValueZ.angle)}`,
        latitude: positionGeo.latitude,
        longitude: positionGeo.longitude,
      };

      this.infoId.innerText = objectInfo.id;
      this.infoLatitude.innerText = objectInfo.latitude;
      this.infoLongitude.innerText = objectInfo.longitude;
      this.infoPosition.innerText = objectInfo.position;
      this.infoRotation.innerText = objectInfo.rotation;
      // put on the last

      this.showIcon(firstDbId, objectInfo);
    } else {
      this.selectedModel = null;
      this.infoLatitude.innerText = "";
      this.infoLongitude.innerText = "";
      this.infoId.innerText = "";
      this.infoPosition.innerText = "";
      this.infoRotation.innerText = "";
      this.enabled = false;

      if (this.infoCard) {
        this.infoCard.remove();
      }
    }
  }

  getRotationModel(rotatedMatrix) {
    const Vx = rotatedMatrix.elements[0];
    const Vy = rotatedMatrix.elements[1];

    let radians;
    if (Vx || Vy) {
      radians = Math.atan2(Vy, Vx);
    } else {
      radians = 0;
    }

    if (radians < 0) {
      radians += 2 * Math.PI;
    }
    const radiansToDegree = Math.round(radians * (180 / Math.PI));
    return { angle: radiansToDegree };
  }

  quaternionToAngle = (rotatedMatrix) => {
    let vec = new THREE.Quaternion();
    vec.setFromRotationMatrix(rotatedMatrix);
    const _w = vec._w;
    let angleRadian = 2 * Math.acos(_w);
    const angle = (angleRadian * 180) / Math.PI;
    return { angle };
  };

  updateInfoObject() {
    let infoPanel = document.createElement("div");
    infoPanel.id = "infoPanel";
    infoPanel.innerHTML = `
    <div >Objet Info</div>
    <div>ID: <span id="infoId"></span></div>
    <div>Position: <span id="infoPosition" ></span></div>
    <div>Rotation: <span id="infoRotation" ></span></div>
    <div>Latitude: <span id="infoLatitude" ></span></div>
    <div>Longitude: <span id="infoLongitude" class="info"></span></div>
    `;

    this.containerInfo.append(infoPanel);
    this.infoId = document.getElementById("infoId");

    this.infoPosition = document.getElementById("infoPosition");
    this.infoRotation = document.getElementById("infoRotation");
    this.infoLatitude = document.getElementById("infoLatitude");
    this.infoLongitude = document.getElementById("infoLongitude");
  }

  idToNumber(id) {
    const numberId = parseInt(id.replace(/[^0-9]/g, ""));
    return numberId;
  }

  init() {
    this.beeController.addGrid();
    this.beeController.addWindDirection(1233);
  }

  initModel() {
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

    // const excavatorProps = {
    //   id: "E1231A43",
    //   position: [5, 10, 0],
    //   rotation: [0, 0, 0],
    // };
    // this.beeController.addExcavator(
    //   excavatorProps.id,
    //   excavatorProps.position,
    //   excavatorProps.rotation
    // );

    // const beaconProp = {
    //   id: "E143231A43",
    //   position: [-5, 10, 0],
    //   rotation: [0, 0, 0],
    // };
    // this.beeController.addBeacon(
    //   beaconProp.id,
    //   beaconProp.position,
    //   beaconProp.rotation
    // );

    // this.beeController.addRestrictedArea(
    //   this.resA.id,
    //   this.resA.position,
    //   this.resA.rotation
    // );

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

  load() {
    const updateIconsCallback = () => {
      if (this.enabled) {
        this.updateIcons();
      }
    };

    this.viewer.addEventListener(
      Autodesk.Viewing.CAMERA_CHANGE_EVENT,
      updateIconsCallback
    );
    this.viewer.addEventListener(
      Autodesk.Viewing.ISOLATE_EVENT,
      updateIconsCallback
    );
    this.viewer.addEventListener(
      Autodesk.Viewing.HIDE_EVENT,
      updateIconsCallback
    );
    this.viewer.addEventListener(
      Autodesk.Viewing.SHOW_EVENT,
      updateIconsCallback
    );
  }

  updateIcons() {
    if (this.infoCard && this.posModel) {
      const pos = this.viewer.worldToClient(this.posModel);

      console.log(pos);
      this.infoCard.style.left = `${Math.floor(
        50 + pos.x - this.infoCard.offsetWidth / 2
      )}px`;
      this.infoCard.style.top = `${Math.floor(
        50 + pos.y - this.infoCard.offsetWidth / 2
      )}px`;
      const id = this.infoCard.dataset.id;
      console.log(this.viewer.isNodeVisible(id));
      this.infoCard.style.display = this.viewer.isNodeVisible(id)
        ? "block"
        : "none";
    }
  }

  showIcon(dbId, objectInfo) {
    if (!this.enabledIcon) return;

    this.infoCard = document.createElement("div");
    this.infoCard.setAttribute("class", "labelModel");
    this.infoCard.setAttribute("data-id", `${dbId}`);

    let infoData = document.createElement("div");
    infoData.id = "infoData";
    if (objectInfo) {
      infoData.innerHTML = `
      <div>ID: <span id="infoId">${objectInfo.id}</span></div>
      <div>Position: <span id="infoPosition" >${objectInfo.position}</span></div>
      <div>Rotation: <span id="infoRotation" >${objectInfo.rotation}</span></div>
      <div>Lat: <span id="infoLatitude" >${objectInfo.latitude}</span></div>
      <div>Long: <span id="infoLongitude" class="info">${objectInfo.longitude}</span></div>

      `;
      // <div style="width: 50px; height: 50px; background-color: #fff; margin: 10px auto 0;">
      //   <img
      //     src="/assets/images/png/img_gps_dasloop_online.png"
      //     style="max-width: 100%; max-height: 100%;"
      //   />
      // </div>;
    }

    this.infoCard.append(infoData);
    const viewerContainer = document.querySelector(
      `#${this.viewer.clientContainer.id}`
    );
    viewerContainer.appendChild(this.infoCard);

    this.updateIcons();
  }

  getDataUWB() {
    this.socket.on("UpdatePosition", (data) => {});

    this.socket.on("UpdateUWB", (data) => {
      this.getDatasUWB(data);
    });

    this.socket.on("UpdateWorker", (data) => {
      // this.getDatas(data);
    });
  }

  getTypeOfModel(dbId) {
    // model only receive int number
    let idDevice = "";
    const typeModel = dbId.slice(0, 4);
    switch (typeModel) {
      case "5001":
        idDevice = dbId.replace(/^.{4}/g, "AOA-");
        break;
      case "5002":
        idDevice = dbId.replace(/^.{4}/g, "Worker-");
        break;
      case "5003":
        idDevice = dbId.replace(/^.{4}/g, "RA-");
        break;
      case "5004":
        idDevice = dbId.replace(/^.{4}/g, "EXT-");
        break;
      case "5005":
        idDevice = dbId.replace(/^.{4}/g, "BCN-");
        break;
      default:
        idDevice = dbId;
        break;
    }
    return { idDevice };
  }

  getDatasUWB(datas) {
    const datasAOA = datas;
    const AOA = this.beeController.objects.get(this.aoa.id);
    if (AOA) {
      const AOAproperty = AOA.getPlacementTransform();

      const AOAprops = {
        position: {
          x: AOAproperty.elements[12],
          y: AOAproperty.elements[13],
          z: AOAproperty.elements[14],
        },
        rotation: {
          x: 0,
          y: 0,
          z: this.getRotationModel(AOAproperty).angle,
        },
      };

      const coordAOA = this.coordinateConverter.calculateUWBPosition(
        datasAOA.position.distance,
        datasAOA.position.degree,
        AOAprops.rotation.z,
        AOAprops.position.x,
        AOAprops.position.y
      );

      const beeObjects = this.beeController.objects;
      if (!beeObjects.has(datasAOA.id) && !this.markerMap.has(datasAOA.id)) {
        this.beeController.addNewWorker(datasAOA.id, coordAOA);
      } else {
        const worker = this.beeController.objects.get(datasAOA.id);
        worker.setPlacementTransform(
          new THREE.Matrix4().setPosition({
            x: coordAOA[0] ?? 0,
            y: coordAOA[1] ?? 0,
            z: AOAprops.position.z - 2 ?? 0,
          })
        );
      }
    }
  }

  getDatas(datas) {
    const geo = this.coordinateConverter.cartesianToGeographic(
      datas.position[0],
      datas.position[1]
    );
    const positionPlant = this.coordinateConverter.geographicToCartesian(
      datas.positionPlant[0],
      datas.positionPlant[1]
    );

    const beeObjects = this.beeController.objects;
    if (
      !beeObjects.has(datas.id) &&
      this.modelBuilder &&
      !this.markerMap.has(datas.id)
    ) {
      this.beeController.addNewWorker(datas.id, datas.position);

      const el = document.createElement("div");
      el.className = "worker workerMarker";
      const newMarker = new mapboxgl.Marker(el, {
        offset: [0, -20],
      })
        .setLngLat({
          lat: geo.latitude,
          lng: geo.longitude,
        })
        .addTo(this.map);

      this.markerMap.set(datas.id, newMarker);
    } else {
      const worker = beeObjects.get(datas.id);
      worker.setPlacementTransform(
        new THREE.Matrix4().setPosition({
          x: datas.position[0],
          y: datas.position[1],
          z: datas.position[2],
        })
      );
      this.markerMap.get(datas.id).setLngLat({
        lat: geo.latitude,
        lng: geo.longitude,
      });
    }

    if (!beeObjects.has(datas.idPlant) && !this.markerMap.has(datas.idPlant)) {
      const pl = document.createElement("div");
      pl.className = "plant plantMarker";
      const plantMarker = new mapboxgl.Marker(pl, {
        offset: [0, -20],
      })
        .setLngLat({
          lat: datas.positionPlant[0],
          lng: datas.positionPlant[1],
        })
        .addTo(this.map);
      this.markerMap.set(datas.idPlant, plantMarker);

      this.beeController.addExcavator(datas.idPlant, positionPlant);
    } else {
      this.markerMap.get(datas.idPlant).setLngLat({
        lat: datas.positionPlant[0],
        lng: datas.positionPlant[1],
      });

      const plant = beeObjects.get(datas.idPlant);
      plant.setPlacementTransform(
        new THREE.Matrix4().setPosition({
          x: positionPlant.x ?? 0,
          y: positionPlant.y ?? 0,
          z: positionPlant.z ?? 0,
        })
      );
    }
  }

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }

  updateBuildingPosition() {
    const form = document.createElement("form");
    form.setAttribute("id", "myform");
    const containerInput = document.createElement("div");
    containerInput.className = "containerInput";
    const title = document.createElement("div");
    title.className = "title-form";
    title.innerText = "Building Setup";
    const inputPosX = document.createElement("input");
    const inputPosY = document.createElement("input");
    const inputPosZ = document.createElement("input");
    const inputRotation = document.createElement("input");
    const labelRotation = document.createElement("label");
    const labelX = document.createElement("label");
    const labelY = document.createElement("label");
    const labelZ = document.createElement("label");
    this.setAttributes(labelX, { for: "x" });
    labelX.innerText = "x";
    this.setAttributes(labelY, { for: "y" });
    labelY.innerText = "y";
    this.setAttributes(labelZ, { for: "z" });
    labelZ.innerText = "z";
    this.setAttributes(inputRotation, { for: "angle" });
    labelRotation.innerText = "d";
    this.setAttributes(inputRotation, {
      name: "angle",
      id: "angle",
      type: "number",
      value: 0,
      class: "input-rotation",
    });

    this.setAttributes(inputPosX, {
      name: "x",
      id: "x",
      type: "number",
      value: 0,
      class: "input-position",
    });
    this.setAttributes(inputPosY, {
      name: "y",
      id: "y",
      type: "number",
      value: 0,
      class: "input-position",
    });
    this.setAttributes(inputPosZ, {
      name: "z",
      id: "z",
      type: "number",
      value: 0,
      class: "input-position",
    });
    const submit = document.createElement("input");
    this.setAttributes(submit, {
      type: "submit",
      class: "submit-position",
    });
    submit.innerText = "Submit";
    containerInput.append(
      labelX,
      inputPosX,
      labelY,
      inputPosY,
      labelZ,
      inputPosZ
    );
    const angleSubmit = document.createElement("div");
    angleSubmit.className = "submit-setup";
    angleSubmit.append(labelRotation, inputRotation, submit);
    form.append(containerInput, angleSubmit);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueX = form.elements.namedItem("x").value;
      this.valueY = form.elements.namedItem("y").value;
      this.valueZ = form.elements.namedItem("z").value;
      this.valueRot = form.elements.namedItem("angle").value;
      if (
        !isNaN(this.valueX) &&
        this.valueX !== "" &&
        this.valueX !== undefined &&
        !isNaN(this.valueY) &&
        this.valueY !== "" &&
        this.valueY !== undefined &&
        !isNaN(this.valueZ) &&
        this.valueZ !== "" &&
        this.valueZ !== undefined &&
        !isNaN(this.valueRot) &&
        this.valueRot !== "" &&
        this.valueRot !== undefined
      ) {
        this.translation = new THREE.Matrix4().makeTranslation(
          this.valueX,
          this.valueY,
          this.valueZ
        );
        const angleRadian = CoordinateConverter.degreeToRadian(this.valueRot);
        let rotate = new THREE.Matrix4().makeRotationZ(angleRadian);
        this.viewer.model.setPlacementTransform(
          this.translation.multiply(rotate)
        );
      }
    });
    this.containerBuilding.append(title);
    this.containerBuilding.append(form);
  }

  updateBuildingRotation() {
    const formRotation = document.createElement("form");
    formRotation.setAttribute("id", "myformRotation");
    const containerRotation = document.createElement("div");
    containerRotation.className = "containerRotation";
    const inputAngle = document.createElement("input");
    const labelAngle = document.createElement("label");
    const titleAngle = document.createElement("h6");
    const latLongCenter = document.createElement("div");
    latLongCenter.classList.add("latlong-bee");

    const position = this.coordinateConverter.getCenter();
    latLongCenter.innerText = `Lat: ${position.latitude}, Long: ${position.longitude}`;
    titleAngle.innerText = "Rotation";
    titleAngle.className = "title-rotation";
    this.setAttributes(labelAngle, { for: "angle" });
    labelAngle.innerText = "angle";
    this.setAttributes(inputAngle, {
      name: "angle",
      id: "angle",
      type: "number",
      value: 0,
      class: "input-rotation",
    });
    const submitAngle = document.createElement("input");
    this.setAttributes(submitAngle, {
      type: "submit",
      class: "submit-rotation",
    });
    submitAngle.innerText = "Submit";
    containerRotation.append(inputAngle, labelAngle, submitAngle);
    formRotation.append(titleAngle, containerRotation);
    formRotation.addEventListener("submit", (e) => {
      e.preventDefault();
      this.angleRotation = formRotation.elements.namedItem("angle").value;
      if (
        !isNaN(this.angleRotation) &&
        this.angleRotation !== "" &&
        this.angleRotation !== undefined
      ) {
        const angleRadian = CoordinateConverter.degreeToRadian(
          this.angleRotation
        );

        this.rotation = new THREE.Matrix4().makeRotationZ(angleRadian);
        if (this.translation) {
          this.viewer.model.setPlacementTransform(
            this.rotation.multiply(this.translation)
          );
        } else {
          this.viewer.model.setPlacementTransform(this.rotation);
        }
      }
    });
    this.containerBuilding.append(formRotation);
    this.containerBuilding.append(latLongCenter);
  }

  updateLatLong() {
    const latLongCenter = document.createElement("div");
    latLongCenter.classList.add("latlong-bee");
    const position = this.coordinateConverter.getCenter();
    latLongCenter.innerText = `Lat: ${position.latitude}, Long: ${position.longitude}`;
    this.containerBuilding.append(latLongCenter);
  }

  setUpAOA() {
    const form = document.createElement("form");
    form.setAttribute("id", "myform");
    const containerInput = document.createElement("div");
    containerInput.className = "containerInput";
    const title = document.createElement("div");
    title.className = "title-form";
    title.innerText = "AOA Setup";
    const inputPosX = document.createElement("input");
    const inputPosY = document.createElement("input");
    const inputPosZ = document.createElement("input");
    const inputRotation = document.createElement("input");
    const labelRotation = document.createElement("label");
    const labelX = document.createElement("label");
    const labelY = document.createElement("label");
    const labelZ = document.createElement("label");
    this.setAttributes(labelX, { for: "x" });
    labelX.innerText = "x";
    this.setAttributes(labelY, { for: "y" });
    labelY.innerText = "y";
    this.setAttributes(labelZ, { for: "z" });
    labelZ.innerText = "z";
    this.setAttributes(inputRotation, { for: "angle" });
    labelRotation.innerText = "d";
    this.setAttributes(inputRotation, {
      name: "angle",
      id: "angle",
      type: "number",
      value: 0,
      class: "input-rotation",
    });

    this.setAttributes(inputPosX, {
      name: "x",
      id: "x",
      type: "number",
      value: 0,
      class: "input-position",
    });
    this.setAttributes(inputPosY, {
      name: "y",
      id: "y",
      type: "number",
      value: 0,
      class: "input-position",
    });
    this.setAttributes(inputPosZ, {
      name: "z",
      id: "z",
      type: "number",
      value: 0,
      class: "input-position",
    });
    const submit = document.createElement("input");
    this.setAttributes(submit, {
      type: "submit",
      class: "submit-position",
    });
    submit.innerText = "Submit";
    containerInput.append(
      labelX,
      inputPosX,
      labelY,
      inputPosY,
      labelZ,
      inputPosZ
    );
    const createAOA = document.createElement("button");
    this.setAttributes(createAOA, {
      class: "create-aoa",
    });
    createAOA.innerText = "Add";

    const deleteAOA = document.createElement("button");
    this.setAttributes(deleteAOA, {
      class: "delete-aoa",
    });
    deleteAOA.innerText = "Delete";

    const angleSubmit = document.createElement("div");
    angleSubmit.className = "submit-setup";
    angleSubmit.append(labelRotation, inputRotation, submit);
    form.append(containerInput, angleSubmit);

    createAOA.addEventListener("click", () => {
      this.beeController.addUWB(
        this.aoa.id,
        this.aoa.position,
        this.aoa.rotation
      );
    });

    deleteAOA.addEventListener("click", () => {
      this.viewer.impl.unloadModel(this.selectedModel);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueAOA_X = form.elements.namedItem("x").value;
      this.valueAOA_Y = form.elements.namedItem("y").value;
      this.valueAOA_Z = form.elements.namedItem("z").value;
      this.valueAOA_Rotation = form.elements.namedItem("angle").value;
      if (
        !isNaN(this.valueAOA_X) &&
        this.valueAOA_X !== "" &&
        this.valueAOA_X !== undefined &&
        !isNaN(this.valueAOA_Y) &&
        this.valueAOA_Y !== "" &&
        this.valueAOA_Y !== undefined &&
        !isNaN(this.valueAOA_Z) &&
        this.valueAOA_Z !== "" &&
        this.valueAOA_Z !== undefined &&
        !isNaN(this.valueAOA_Rotation) &&
        this.valueAOA_Rotation !== "" &&
        this.valueAOA_Rotation !== undefined
      ) {
        if (this.selectedModel) {
          const translation = new THREE.Matrix4().makeTranslation(
            this.valueAOA_X,
            this.valueAOA_Y,
            this.valueAOA_Z
          );
          const angleRadian = CoordinateConverter.degreeToRadian(
            this.valueAOA_Rotation
          );
          const rotationAOA = new THREE.Matrix4().makeRotationZ(angleRadian);
          this.selectedModel.setPlacementTransform(
            translation.multiply(rotationAOA)
          );
        }
      }
    });
    this.containerUWB.append(title);
    this.containerUWB.append(form);
    this.containerUWB.append(createAOA, deleteAOA);
  }

  setVisibility() {
    const buttonVisibility = document.createElement("div");
    buttonVisibility.innerText = "Show/Hide Building";
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
    this.containerBuilding.append(buttonVisibility);
  }

  rotateCamera = () => {
    if (this.started) {
      requestAnimationFrame(this.rotateCamera);
    }

    const nav = this.viewer.navigation;
    const up = nav.getCameraUpVector();
    const axis = new THREE.Vector3(0, 0, 1);
    const speed = (10.0 * Math.PI) / 180;
    const matrix = new THREE.Matrix4().makeRotationAxis(axis, speed * 0.01);

    let pos = nav.getPosition();
    pos.applyMatrix4(matrix);
    up.applyMatrix4(matrix);
    nav.setView(pos, new THREE.Vector3(0, 0, 0));
    nav.setCameraUpVector(up);
    this.viewer.getState();
  };

  uninitialize() {
    console.info("uninitialize");
    this.socket.close();
    this._disableTransformTool();
    this.viewer.removeEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this.onSelection
    );
    this.beeController.unloadModel();
  }
}
