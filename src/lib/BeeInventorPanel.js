/* mapboxgl */
import "../css/main.css";
import { BeeInventorModel } from "./BeeInventorModel";
import { CoordinateConverter } from "./CoordinateConverter";
import { EditableGeoJsonLayer } from "@nebula.gl/layers";
import { DrawPolygonMode } from "@nebula.gl/edit-modes";
import { Deck } from "@deck.gl/core";
import { DarkMode } from "./tools/DarkMode";
import { TransformToolUI } from "./tools/TransformTools";
import { InfoCardUI } from "./tools/InfoCard";
import { AOAtools } from "./tools/AOA";
import { Building } from "./tools/Building";
import { RotateCamera } from "./tools/RotateCamera";
import { InitialModel } from "./InitialSetupModel";
import { MainConverter } from "./MainConverter";
import { RestrictedArea } from "./tools/RestrictedArea";

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

    this.containerAOA = document.createElement("div");
    this.containerAOA.className = "containerAOA";
    this.container.append(this.containerAOA);

    this.containerGeneralTool = document.createElement("div");
    this.containerGeneralTool.className = "generalTool";
    this.container.append(this.containerGeneralTool);

    this.containerRestrictedArea = document.createElement("div");
    this.containerRestrictedArea.className = "generalTool";
    this.container.append(this.containerRestrictedArea);

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

    this.aoa = {
      id: "4219",
      position: [0, 0, 2],
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

    this.markerMap = new Map();
    this.socket = io("http://localhost:3333");
    this.beeController = new BeeInventorModel(this.viewer, this.options);
    this.coordinateConverter = new CoordinateConverter(
      25.069771049083982,
      121.52045303099948
    );
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

    this.init();

    // init Model
    this.initModel = new InitialModel(this.viewer, this.options, {
      converter: this.coordinateConverter,
      controllerModel: this.beeController,
    });
    this.initModel.setupInitialModel();

    this.getDataUWB();
    // Building Setup
    this.geoBuilding = this.coordinateConverter.getCenter();
    this.buildingTool = new Building(this.viewer, this.containerBuilding);
    this.buildingTool.buildingSetup(this.geoBuilding);
    this.buildingTool.buildingVisibility();

    this.updateInfoObject();
    // AOA Setup
    this.setupAOA = new AOAtools(this.viewer, this.containerAOA, this.options, {
      controllerModel: this.beeController,
    });
    this.setupAOA.AOAsetup(this.selectedModel);

    // InfoCard Setup
    this.infoCardTool = new InfoCardUI(this.viewer, this.containerGeneralTool);
    this.infoCardTool.infoCardSetup();
    this.infoCardTool.updateIconEvent(this.posModel);

    // Transform Setup
    this.transformTool = new TransformToolUI(
      this.viewer,
      this.containerGeneralTool
    );
    this.transformTool.transformToolSetup();

    // Dark Mode Setup
    this.darkMode = new DarkMode(this.viewer, this.containerGeneralTool);
    this.darkMode.darkModeToolSetup();

    // Rotate Camera Setup
    this.rotateCamera = new RotateCamera(
      this.viewer,
      this.containerGeneralTool
    );
    this.rotateCamera.rotateCameraSetup();

    this.restrictedArea = new RestrictedArea(
      this.viewer,
      this.containerRestrictedArea
    );
    this.restrictedArea.restrictedAreaSetup();
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
    this.infoCardTool.clearInfoCard();

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

      const rotationValueZ = MainConverter.getRotationModel(rotatedMatrix);
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

      const positionGeo = this.coordinateConverter.cartesianToGeographic(
        this.posModel.x,
        this.posModel.y
      );
      const idModel = MainConverter.getTypeOfModel(firstDbId.toString());

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
      this.restrictedArea.RASelected(model);
      this.infoCardTool.showIcon(firstDbId, objectInfo, this.posModel);
      this.infoCardTool.selectedModel(model);
      this.setupAOA.AOASelected(this.selectedModel);
    } else {
      this.selectedModel = null;
      this.infoLatitude.innerText = "";
      this.infoLongitude.innerText = "";
      this.infoId.innerText = "";
      this.infoPosition.innerText = "";
      this.infoRotation.innerText = "";
      this.infoCardTool.clearInfoCard();
    }
  }

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

  init() {
    this.beeController.addGrid();
    this.beeController.addWindDirection(1233);
  }

  getDataUWB() {
    this.socket.on("UpdateUWB", (data) => {
      this.getDatasUWB(data);
    });

    this.socket.on("UpdateWorker", (data) => {
      // this.getDatas(data);
    });
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
          z: MainConverter.getRotationModel(AOAproperty).angle,
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

  uninitialize() {
    console.info("uninitialize");
    this.socket.close();
    this.viewer.removeEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this.onSelection
    );
    this.beeController.unloadModel();
  }
}
