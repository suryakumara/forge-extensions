import { BeeInventorModel } from "./BeeInventorModel";
import { CoordinateConverter } from "./CoordinateConverter";
import { DarkMode } from "./tools/DarkMode";
import { TransformToolUI } from "./tools/TransformTools";
import { InfoCardUI } from "./tools/InfoCard";
import { AOAtools } from "./tools/AOA";
import { Building } from "./tools/Building";
import { RotateCamera } from "./tools/RotateCamera";
import { InitialModel } from "./InitialSetupModel";
import { MainConverter } from "./MainConverter";
import { RestrictedArea } from "./tools/RestrictedArea";
import { ObjectInfo } from "./tools/ObjectInfo";

import "../css/main.css";

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
      width: 300px;
      padding: 10px;
      height: 500px;
      resize: auto;
    `;

    this.containerInfo = document.createElement("div");
    this.containerInfo.className = "containerInfo";
    this.container.append(this.containerInfo);

    const genTool = document.createElement("div");
    genTool.className = "generalTool";
    genTool.innerHTML = `
    <div class="container-bee">
       <button type="button" class="collapsible"><div class="glyphicon glyphicon-tasks"/><span>General Tool</span></button>
       <div class="content" id="containerGeneralTool"></div>
    </div>
    `;
    this.container.append(genTool);
    this.containerGeneralTool = document.getElementById("containerGeneralTool");

    this.containerBuilding = document.createElement("div");
    this.containerBuilding.className = "containerBuilding";
    this.container.append(this.containerBuilding);

    this.containerAOA = document.createElement("div");
    this.containerAOA.className = "containerAOA";
    this.container.append(this.containerAOA);

    this.containerRestrictedArea = document.createElement("div");
    this.containerRestrictedArea.className = "containerRA";
    this.container.append(this.containerRestrictedArea);

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

    this.onSelection = this.onSelection.bind(this);
    this.viewer.addEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this.onSelection
    );

    this.socket = io("http://localhost:3333");
    this.beeController = new BeeInventorModel(this.viewer, this.options);
    this.coordinateConverter = new CoordinateConverter(
      25.069771049083982,
      121.52045303099948
    );

    // init Model
    this.initModel = new InitialModel(this.viewer, this.options, {
      converter: this.coordinateConverter,
      controllerModel: this.beeController,
    });
    this.initModel.gridAndWindDirection();
    this.initModel.setupInitialModel();

    this.getDataUWB();

    // Object Info
    this.objectInfo = new ObjectInfo(this.viewer, this.containerInfo);
    this.objectInfo.objectInfoSetup();

    // Building Setup
    this.geoBuilding = this.coordinateConverter.getCenter();
    this.buildingTool = new Building(this.viewer, this.containerBuilding);
    this.buildingTool.buildingSetup();
    this.buildingTool.updateBuilding();
    this.buildingTool.updateLatLong(this.geoBuilding);
    this.buildingTool.updateVisibility();

    // AOA Setup
    this.setupAOA = new AOAtools(this.viewer, this.containerAOA, this.options, {
      controllerModel: this.beeController,
    });
    this.setupAOA.AOAsetup(this.selectedModel);
    this.setupAOA.updateAOA();
    this.setupAOA.AOAexistence();

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
    this.restrictedArea.updateREstricted();
    this.collapseButton();
  }

  collapseButton() {
    const coll = document.getElementsByClassName("collapsible");
    if (!coll) return;
    for (let i = 0; i < coll.length; i++) {
      coll[i].addEventListener("click", function () {
        coll[i].classList.toggle("activesetup");
        const content = coll[i].nextElementSibling;
        if (content.style.display === "block") {
          content.style.display = "none";
        } else {
          content.style.display = "block";
        }
      });
    }
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

      this.objectInfo.updateInfo(objectInfo);

      // put on the last
      this.restrictedArea.RASelected(model);
      this.infoCardTool.showIcon(firstDbId, objectInfo, this.posModel);
      this.infoCardTool.selectedModel(model);
      this.setupAOA.AOASelected(this.selectedModel);
    } else {
      this.selectedModel = null;
      this.objectInfo.clearInfo();
      this.infoCardTool.clearInfoCard();
    }
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
    const AOA_id = this.setupAOA.id_AOA;
    const AOA = this.beeController.objects.get(AOA_id);

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
      if (!beeObjects.has(datasAOA.id)) {
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
    if (!beeObjects.has(datas.id)) {
      this.beeController.addNewWorker(datas.id, datas.position);
    } else {
      const worker = beeObjects.get(datas.id);
      worker.setPlacementTransform(
        new THREE.Matrix4().setPosition({
          x: datas.position[0],
          y: datas.position[1],
          z: datas.position[2],
        })
      );
    }

    if (!beeObjects.has(datas.idPlant)) {
      this.beeController.addExcavator(datas.idPlant, positionPlant);
    } else {
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

  handleAOAbyMouse() {
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
  }
}
