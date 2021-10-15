/* mapboxgl */
import { BeeInventorModel } from "./BeeInventorModel";
import { CoordinateConverter } from "./CoordinateConverter";
import { ForgeController } from "./ForgeController";
import { io } from "socket.io-client";

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
      width: 380px;
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
    border: 0.5px solid #f04136;
  `;
    this.container.append(this.containerInfo);

    this.containerUWB = document.createElement("div");
    this.containerUWB.className = "containerUWB";
    this.container.append(this.containerUWB);

    this.sceneBuilder = null;
    this.modelBuilder = null;

    this.infoId = null;
    this.infoPosition = null;
    this.infoRotation = null;
    this.infoLatitude = null;
    this.infoLongitude = null;
    this.started = false;

    this.aoa = {
      id: "AB0014",
      position: [4, -5, 2],
      rotation: [0, 135, 0],
    };

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
        this.init(this.modelBuilder, this.aoa);
        console.log("modelBuilder Created.");
      });
    this.onSelection = this.onSelection.bind(this);
    this.viewer.addEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this.onSelection
    );

    this.beeController = new BeeInventorModel(this.viewer, this.options);
    this.forgeController = new ForgeController(this.viewer, this.options);
    this.coordinateConverter = new CoordinateConverter(
      25.069771049083982,
      121.52045303099948
    );
    this.markerMap = new Map();

    // mapbox
    this.containerMapbox = document.createElement("div");
    this.containerMapbox.setAttribute("id", "map");
    this.viewerContainer = document.querySelector(
      `#${this.viewer.clientContainer.id}`
    );
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

    this.getDataUWB();
    this.updateBuildingPosition();
    this.updateBuildingRotation();
    this.setVisibility();
    this.updateInfoObject();
    this.updateUWBPosition();
  }

  onSelection(event) {
    const selSet = event.selections;
    const firstSel = selSet[0];
    if (firstSel) {
      const model = firstSel.model;

      let translation = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        scale = new THREE.Vector3();
      model.getPlacementTransform().decompose(translation, rotation, scale);

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

      const position = bounds.getCenter();
      const positionGeo = this.coordinateConverter.cartesianToGeographic(
        position.x,
        position.y
      );
      this.infoLatitude.innerText = positionGeo.latitude;
      this.infoLongitude.innerText = positionGeo.longitude;
      this.infoId.innerText = firstDbId;
      this.infoPosition.innerText = `${Math.floor(position.x)},${Math.floor(
        position.y
      )},${Math.floor(position.z)}`;
      this.infoRotation.innerText = `${Math.floor(rotation.x)},${Math.floor(
        rotation.y
      )},${Math.floor(rotation.z)}`;
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

  idToNumber(id) {
    const numberId = parseInt(id.replace(/[^0-9]/g, ""));
    return numberId;
  }

  init(modelBuilder, AOA) {
    this.beeController.addUWB(modelBuilder, AOA.id, AOA.position, AOA.rotation);
  }

  getDataUWB() {
    const socket = io("http://localhost:3333");
    socket.on("UpdatePosition", (data) => {
      // console.log(data);
    });

    socket.on("UpdateUWB", (data) => {
      this.getDatasUWB(data);
    });

    socket.on("UpdateWorker", (data) => {
      this.getDatas(data);
    });
  }

  getDatasUWB(datas) {
    const datasAOA = datas;

    const aoa = this.beeController.objects[this.aoa.id];
    let positionAOA = new THREE.Vector3();
    positionAOA.setFromMatrixPosition(aoa.matrixWorld);

    const coordAOA = this.coordinateConverter.calculateUWBPosition(
      datasAOA.position.distance,
      datasAOA.position.degree,
      this.aoa.rotation[1],
      positionAOA.x,
      positionAOA.y
    );

    const forgeObject = this.forgeController.objects;

    if (
      aoa &&
      !forgeObject.has(datasAOA.id) &&
      !this.markerMap.has(datasAOA.id)
    ) {
      this.forgeController.loadWorkerModel(datasAOA.id, coordAOA);
      this.beeController.addWorkerId(this.modelBuilder, datasAOA.id, coordAOA);
    } else {
      const worker = this.forgeController.getObject(datasAOA.id);
      worker.setPlacementTransform(
        new THREE.Matrix4().setPosition({
          x: coordAOA[0],
          y: coordAOA[1],
          z: coordAOA[2] ?? 0,
        })
      );
      const workerTag = this.beeController.objects[datasAOA.id];
      workerTag.matrix.setPosition(
        new THREE.Vector3(coordAOA[0], coordAOA[1], coordAOA[2] ?? 0)
      );
      this.modelBuilder.updateMesh(workerTag);
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
    const forgeObject = this.forgeController.objects;
    if (
      !forgeObject.has(datas.id) &&
      this.modelBuilder &&
      !this.markerMap.has(datas.id)
    ) {
      this.forgeController.loadWorkerModel(datas.id, datas.position);
      this.beeController.addWorkerId(
        this.modelBuilder,
        datas.id,
        datas.position
      );
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
      const worker = this.forgeController.getObject(datas.id);
      worker.setPlacementTransform(
        new THREE.Matrix4().setPosition({
          x: datas.position[0],
          y: datas.position[1],
          z: datas.position[2],
        })
      );
      const workerTag = this.beeController.objects[datas.id];
      workerTag.matrix.setPosition(
        new THREE.Vector3(
          datas.position[0],
          datas.position[1],
          datas.position[2]
        )
      );
      this.modelBuilder.updateMesh(workerTag);
      this.markerMap.get(datas.id).setLngLat({
        lat: geo.latitude,
        lng: geo.longitude,
      });
    }

    if (
      !forgeObject.has(datas.idPlant) &&
      !this.markerMap.has(datas.idPlant) &&
      this.modelBuilder
    ) {
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

      this.forgeController.loadPlantModel(datas.idPlant, positionPlant);
      this.beeController.addPlantId(
        this.modelBuilder,
        datas.idPlant,
        positionPlant
      );
    } else {
      this.markerMap.get(datas.idPlant).setLngLat({
        lat: datas.positionPlant[0],
        lng: datas.positionPlant[1],
      });
      const plant = this.forgeController.getObject(datas.idPlant);
      plant.setPlacementTransform(
        new THREE.Matrix4().setPosition({
          x: positionPlant.x,
          y: positionPlant.y,
          z: 0,
        })
      );
      const plantTag = this.beeController.objects[datas.idPlant];
      plantTag.matrix.setPosition(
        new THREE.Vector3(positionPlant.x, positionPlant.y, 0)
      );
      this.modelBuilder.updateMesh(plantTag);
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
    title.style.cssText = `
      text-align: center;
      font-size: small;
      background-color: #232323;
    `;
    title.innerText = "Building Setup";

    const inputPosX = document.createElement("input");
    const inputPosY = document.createElement("input");
    const inputPosZ = document.createElement("input");
    const labelX = document.createElement("label");
    const labelY = document.createElement("label");
    const labelZ = document.createElement("label");
    const subTitlePosition = document.createElement("h6");
    subTitlePosition.innerText = "Position";
    subTitlePosition.className = "title-position";
    this.setAttributes(labelX, { for: "x" });
    labelX.innerText = "x";
    this.setAttributes(labelY, { for: "y" });
    labelY.innerText = "y";
    this.setAttributes(labelZ, { for: "z" });
    labelZ.innerText = "z";

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
      inputPosX,
      labelX,
      inputPosY,
      labelY,
      inputPosZ,
      labelZ,
      submit
    );
    form.append(subTitlePosition, containerInput);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueX = form.elements.namedItem("x").value;
      this.valueY = form.elements.namedItem("y").value;
      this.valueZ = form.elements.namedItem("z").value;
      if (
        !isNaN(this.valueX) &&
        this.valueX !== "" &&
        this.valueX !== undefined &&
        !isNaN(this.valueY) &&
        this.valueY !== "" &&
        this.valueY !== undefined &&
        !isNaN(this.valueZ) &&
        this.valueZ !== "" &&
        this.valueZ !== undefined
      ) {
        this.translation = new THREE.Matrix4().makeTranslation(
          this.valueX,
          this.valueY,
          this.valueZ
        );
        if (this.rotation) {
          this.viewer.model.setPlacementTransform(
            this.translation.multiply(this.rotation)
          );
        } else {
          this.viewer.model.setPlacementTransform(this.translation);
        }
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
  }

  updateUWBPosition() {
    const form = document.createElement("form");
    form.setAttribute("id", "uwb-form");
    const containerInput = document.createElement("div");
    containerInput.className = "uwbcontainerInput";

    const inputPosX = document.createElement("input");
    const inputPosY = document.createElement("input");
    const inputPosZ = document.createElement("input");
    const labelX = document.createElement("label");
    const labelY = document.createElement("label");
    const labelZ = document.createElement("label");
    const title = document.createElement("h6");
    title.innerText = "Position";
    title.className = "uwb-title-position";
    this.setAttributes(labelX, { for: "x" });
    labelX.innerText = "x";
    this.setAttributes(labelY, { for: "y" });
    labelY.innerText = "y";
    this.setAttributes(labelZ, { for: "z" });
    labelZ.innerText = "z";

    this.setAttributes(inputPosX, {
      name: "x",
      id: "x",
      type: "number",
      value: 0,
      class: "uwb-input-position",
    });
    this.setAttributes(inputPosY, {
      name: "y",
      id: "y",
      type: "number",
      value: 0,
      class: "uwb-input-position",
    });
    this.setAttributes(inputPosZ, {
      name: "z",
      id: "z",
      type: "number",
      value: 0,
      class: "uwb-input-position",
    });
    const submit = document.createElement("input");
    this.setAttributes(submit, {
      type: "submit",
      class: "uwb-submit-position",
    });
    submit.innerText = "Submit";
    containerInput.append(
      inputPosX,
      labelX,
      inputPosY,
      labelY,
      inputPosZ,
      labelZ,
      submit
    );
    form.append(title, containerInput);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueUWB_X = form.elements.namedItem("x").value;
      this.valueUWB_Y = form.elements.namedItem("y").value;
      this.valueUWB_Z = form.elements.namedItem("z").value;
      if (
        !isNaN(this.valueUWB_X) &&
        this.valueUWB_X !== "" &&
        this.valueUWB_X !== undefined &&
        !isNaN(this.valueUWB_Y) &&
        this.valueUWB_Y !== "" &&
        this.valueUWB_Y !== undefined &&
        !isNaN(this.valueUWB_Z) &&
        this.valueUWB_Z !== "" &&
        this.valueUWB_Z !== undefined
      ) {
        const aoa = this.beeController.objects[this.aoa.id];
        aoa.matrix.setPosition(
          new THREE.Vector3(this.valueUWB_X, this.valueUWB_Y, this.valueUWB_Z)
        );
        this.modelBuilder.updateMesh(aoa);
      }
    });

    this.containerUWB.append(form);
  }

  setVisibility() {
    const buttonVisibility = document.createElement("div");
    buttonVisibility.innerText = "Show/Hide Building";
    buttonVisibility.classList.add("button-bee");
    buttonVisibility.addEventListener("click", async () => {
      this.enabled = !this.enabled;
      this.started = !this.started;
      if (this.started) this.rotateCamera();
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

    const nav = viewer.navigation;
    const up = nav.getCameraUpVector();
    const axis = new THREE.Vector3(0, 0, 1);
    const speed = (10.0 * Math.PI) / 180;
    const matrix = new THREE.Matrix4().makeRotationAxis(axis, speed * 0.01);

    let pos = nav.getPosition();
    pos.applyMatrix4(matrix);
    up.applyMatrix4(matrix);
    nav.setView(pos, new THREE.Vector3(0, 0, 0));
    nav.setCameraUpVector(up);
    let viewState = this.viewer.getState();
    console.log(viewState);
  };

  destroy() {
    this.forgeController.destroy();
    if (this.modelBuilder) {
      this.beeController.destroy(this.modelBuilder);
    }
  }
}
