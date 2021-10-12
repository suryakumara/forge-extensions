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
    this.container.style.top = "10px";
    this.container.style.left = "10px";
    this.container.style.width = "380px";
    this.container.style.padding = "10px";
    this.container.style.height = "500px";
    this.container.style.resize = "auto";

    this.containerBuilding = document.createElement("div");
    this.containerBuilding.className = "containerBuilding";
    this.container.append(this.containerBuilding);

    this.containerUWB = document.createElement("div");
    this.containerUWB.className = "containerUWB";
    this.container.append(this.containerUWB);

    this.sceneBuilder = null;
    this.modelBuilder = null;

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

    this.aoa = {
      id: "001",
      position: [4, -5, 0],
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

    this.datas = null;
    this.getDataUWB();
    this.updateBuildingPosition();
    this.updateBuildingRotation();
    this.setVisibility();
    this.updateUWBPosition();
  }

  init(modelBuilder, AOA) {
    this.beeController.addUWB(modelBuilder, AOA.id, AOA.position);
  }

  getDataUWB() {
    setInterval(() => {
      fetch("http://localhost:8080/mqtt/mockdata")
        .then((res) => res.json())
        .then((res) => {
          this.getDatas(res);
          this.getDatasUWB(res);
        })
        .catch((err) => console.log(err));
    }, 2000);
  }

  getDatasUWB(datas) {
    const datasAOA = datas;

    const coordAOA = this.coordinateConverter.calculateUWBPosition(
      datasAOA.distance,
      datasAOA.degree,
      this.aoa.rotation[1],
      this.aoa.position[0],
      this.aoa.position[1]
    );
    console.log(coordAOA);
    const aoa = this.beeController.objects[this.aoa.id];
    const forgeObject = this.forgeController.objects;
    if (
      aoa &&
      !forgeObject.has(datasAOA.tagId) &&
      !this.markerMap.has(datasAOA.tagId)
    ) {
      this.forgeController.loadWorkerModel(datasAOA.tagId, coordAOA);
      this.beeController.addWorkerId(this.modelBuilder, datas.tagId, coordAOA);
    } else {
      const worker = this.forgeController.getObject(datas.tagId);
      worker.setPlacementTransform(
        new THREE.Matrix4().setPosition({
          x: coordAOA[0],
          y: coordAOA[1],
          z: coordAOA[2] ?? 0,
        })
      );
      const workerTag = this.beeController.objects[datas.tagId];
      console.log(workerTag);
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

    const inputPosX = document.createElement("input");
    const inputPosY = document.createElement("input");
    const inputPosZ = document.createElement("input");
    const labelX = document.createElement("label");
    const labelY = document.createElement("label");
    const labelZ = document.createElement("label");
    const title = document.createElement("h6");
    title.innerText = "Position";
    title.className = "title-position";
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
    form.append(title, containerInput);
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
        this.viewer.model.setPlacementTransform(
          new THREE.Matrix4().setPosition({
            x: this.valueX,
            y: this.valueY,
            z: this.valueZ,
          })
        );
      }
    });
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
        this.viewer.model.setPlacementTransform(
          new THREE.Matrix4().makeRotationZ(angleRadian)
        );
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
        alert(this.valueUWB_X, this.valueUWB_Y, this.valueUWB_Z);
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
}
