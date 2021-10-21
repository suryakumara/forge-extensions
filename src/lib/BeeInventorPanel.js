/* mapboxgl */
import { BeeInventorModel } from "./BeeInventorModel";
import { CoordinateConverter } from "./CoordinateConverter";
import { ForgeController } from "./ForgeController";

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

    this.sceneBuilder = null;
    this.modelBuilder = null;

    this.infoId = null;
    this.infoPosition = null;
    this.infoRotation = null;
    this.infoLatitude = null;
    this.infoLongitude = null;
    this.started = false;
    this.selectedModel = null;

    this.aoa = {
      id: "4219",
      position: [4, -5, 2],
      rotation: [0, 135, 0],
    };

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
        this.init();
        console.log("modelBuilder Created.");
      });
    this.onSelection = this.onSelection.bind(this);
    this.viewer.addEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this.onSelection
    );

    document.onkeydown = (event) => {
      if (this.selectedModel) {
        if (event.code === "KeyA") {
          let tr = this.selectedModel.getPlacementTransform();
          tr.elements[12] -= 0.1;
          this.selectedModel.setPlacementTransform(tr);
        }
        if (event.code === "KeyD") {
          let tr = this.selectedModel.getPlacementTransform();
          tr.elements[12] += 0.1;
          this.selectedModel.setPlacementTransform(tr);
        }
      }
    };

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
    this.updateLatLong();
    this.setVisibility();
    this.updateInfoObject();
    this.updateUWBPosition();
  }

  onSelection(event) {
    const selSet = event.selections;
    const firstSel = selSet[0];
    if (firstSel) {
      const model = firstSel.model;
      this.selectedModel = model;

      let translation = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        scale = new THREE.Vector3();
      model.getPlacementTransform().decompose(translation, rotation, scale);

      // const DBids = viewer.impl.selector.getAggregateSelection();
      // console.log(DBids[0]);
      console.log(translation);
      console.log(rotation);
      console.log(model.getPlacementTransform());

      let dbIds = firstSel.dbIdArray;
      let firstDbId = dbIds[0];

      model.getProperties(firstDbId, (data) => {
        console.log(data);
      });
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
      const test = this.beeController.objects[this.aoa.id];
      // console.log(test);
      // console.log(model);

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

  init() {
    // this.beeController.addUWB(modelBuilder, AOA.id, AOA.position, AOA.rotation);

    this.beeController.addUWB(this.aoa.id, this.aoa.position);

    this.worker1 = {
      id: "0010AA",
      position: [0, 20, 0],
      rotation: [0, 135, 0],
    };
    this.beeController.addNewWorker(
      this.worker1.id,
      this.worker1.position,
      this.worker1.rotation
    );

    // const restricted = {
    //   id: "0010AA",
    //   position: [5, 20, 0],
    //   rotation: [0, 0, 0],
    // };
    // this.beeController.addRestrictedArea(
    //   modelBuilder,
    //   restricted.id,
    //   restricted.position,
    //   restricted.rotation
    // );

    // const excavator1 = {
    //   id: "EXC14514213",
    //   position: {
    //     x: -5,
    //     y: 20,
    //     z: 0,
    //   },
    //   rotation: [0, 0, 0],
    // };
    // this.beeController.addExcavator(
    //   excavator1.id,
    //   excavator1.position,
    //   excavator1.rotation
    // );
    // const beacon1 = {
    //   id: "EXC145142135",
    //   position: [-10, 20, 0],
    //   rotation: [0, 0, 0],
    // };
    // this.beeController.addBeacon(
    //   modelBuilder,
    //   beacon1.id,
    //   beacon1.position,
    //   beacon1.rotation
    // );
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
    const aoa = this.beeController.objects.get(this.aoa.id);
    let positionAOA = aoa.getPlacementTransform();
    const positionAOA_X = positionAOA.elements[12];
    const positionAOA_Y = positionAOA.elements[13];
    // const positionAOA_Z = positionAOA.elements[14];
    const coordAOA = this.coordinateConverter.calculateUWBPosition(
      datasAOA.position.distance,
      datasAOA.position.degree,
      this.aoa.rotation[1],
      positionAOA_X,
      positionAOA_Y
    );

    const beeObjects = this.beeController.objects;
    if (
      aoa &&
      !beeObjects.has(datasAOA.id) &&
      !this.markerMap.has(datasAOA.id)
    ) {
      this.beeController.addNewWorker(datasAOA.id, coordAOA);
    } else {
      const worker = this.beeController.objects.get(datasAOA.id);
      worker.setPlacementTransform(
        new THREE.Matrix4().setPosition({
          x: coordAOA[0] ?? 0,
          y: coordAOA[1] ?? 0,
          z: coordAOA[2] ?? 0,
        })
      );
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
        let xform = new THREE.Matrix4();
        let rotate = new THREE.Matrix4().makeRotationZ(angleRadian);
        // let translation = new THREE.Matrix4().makeTranslation(0.1, 0.5, 0.1);
        xform.multiply(rotate);
        xform.multiply(this.translation);
        this.viewer.model.setPlacementTransform(xform);
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
    let viewState = this.viewer.getState();
  };

  destroy() {
    this.forgeController.destroy();
    if (this.modelBuilder) {
      this.beeController.destroy(this.modelBuilder);
    }
  }
}
