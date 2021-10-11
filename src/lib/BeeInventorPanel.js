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
    this.container.style.width = "320px";
    this.container.style.padding = "10px";
    this.container.style.height = "700px";
    this.container.style.resize = "auto";

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
    this.updateBuilding();
  }

  getDataUWB() {
    setInterval(() => {
      fetch("http://localhost:8080/mqtt/mockdata")
        .then((res) => res.json())
        .then((res) => {
          this.getDatas(res);
        })
        .catch((err) => console.log(err));
    }, 3000);
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
      console.log(this.forgeController.objects);
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

  updateBuilding() {
    const form = document.createElement("form");
    form.setAttribute("id", "myform");
    const inputPosX = document.createElement("input");
    const inputPosY = document.createElement("input");
    const inputPosZ = document.createElement("input");
    const angle = document.createElement("input");
    inputPosX.setAttribute("name", "x");
    inputPosY.setAttribute("name", "y");
    inputPosZ.setAttribute("name", "z");
    angle.setAttribute("name", "angle");
    const submit = document.createElement("input");
    submit.setAttribute("type", "submit");
    submit.innerText = "submit_position";
    form.append(inputPosX, inputPosY, inputPosZ, angle, submit);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueX = parseInt(form.elements.namedItem("x").value);
      this.valueY = parseInt(form.elements.namedItem("y").value);
      this.valueZ = parseInt(form.elements.namedItem("z").value);
      this.angle = parseInt(form.elements.namedItem("angle").value);

      this.viewer.model.setPlacementTransform(
        new THREE.Matrix4().setPosition({
          x: this.valueX,
          y: this.valueY,
          z: this.valueZ,
        })
      );
      this.viewer.model.setPlacementTransform(
        new THREE.Matrix4().makeRotationZ(this.angle)
      );
    });
    this.container.append(form);
  }
}
