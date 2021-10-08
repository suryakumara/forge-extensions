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

    this.datas = null;
    this.getDataUWB();
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
    console.log(positionPlant);
    // if (
    //   !this.forgeController.objects.has(datas.id) &&
    //   !this.beeController.objects[datas.id] &&
    //   this.modelBuilder &&
    //   !this.markerMap.has(datas.id) &&
    //   !this.forgeController.objects.has(datas.idPlant)
    // ) {
    //   this.forgeController.loadWorkerModel(datas.id, datas.position);
    //   this.beeController.addWorkerTag(
    //     this.modelBuilder,
    //     datas.id,
    //     datas.position
    //   );
    //   // const el = document.createElement("div");
    //   // el.className = "worker workerMarker";
    //   // const newMarker = new mapboxgl.Marker(el)
    //   //   .setLngLat({
    //   //     lat: geo.latitude,
    //   //     lng: geo.longitude,
    //   //   })
    //   //   .addTo(this.map);
    //   // this.markerMap.set(datas.id, newMarker);

    //   // this.forgeController.loadPlantModel(datas.idPlant, positionPlant);
    // } else {
    //   const worker = this.forgeController.getObject(datas.id);
    //   console.log(worker);
    //   worker.setPlacementTransform(
    //     new THREE.Matrix4().setPosition({
    //       x: datas.position[0],
    //       y: datas.position[1],
    //       z: datas.position[2],
    //     })
    //   );
    //   const workerTag = this.beeController.objects[datas.id];
    //   workerTag.matrix.setPosition(
    //     new THREE.Vector3(
    //       datas.position[0],
    //       datas.position[1],
    //       datas.position[2]
    //     )
    //   );
    //   this.modelBuilder.updateMesh(workerTag);
    //   // const plant = this.forgeController.getObject(datas.idPlant);
    //   // plant.setPlacementTransform(
    //   //   new THREE.Matrix4().setPosition({
    //   //     x: positionPlant.x,
    //   //     y: positionPlant.y,
    //   //     z: 0,
    //   //   })
    //   // );
    //   // this.markerMap.get(datas.id).setLngLat({
    //   //   lat: geo.latitude,
    //   //   lng: geo.longitude,
    //   // });
    // }
  }
  init(modelBuilder) {
    console.log(modelBuilder);
  }
}
