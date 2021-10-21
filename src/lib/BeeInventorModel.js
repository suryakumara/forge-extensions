export class BeeInventorModel {
  constructor(viewer, options) {
    this.viewer = viewer;
    this.options = options;
    this.uwb = null;
    this.model = null;
    this.humanModel = null;
    this.restrictedArea = null;
    this.beacon = null;
    this.excavator = null;
    this.objects = new Map();
  }

  idToNumber(id) {
    let numberId = parseInt(id);
    if (isNaN(id)) {
      numberId = parseInt(id.replace(/[^0-9]/g, ""));
    }
    return numberId;
  }

  addUWB = async (dbId, position, rotation) => {
    const sceneBuilder = await this.viewer.loadExtension(
      "Autodesk.Viewing.SceneBuilder"
    );
    const modelBuilder = await sceneBuilder.addNewModel({
      modelNameOverride: "uwb",
      conserveMemory: false,
    });
    const globalMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0, 0),
    });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const textGeometry = new THREE.TextGeometry(`UWB${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });
    const textMesh = new THREE.Mesh(textGeometry, globalMaterial);
    textMesh.matrix.makeRotationX(-4.7);
    textMesh.matrix.setPosition(new THREE.Vector3(0, 0, 0.7));
    textMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));

    const uwbMesh = new THREE.Mesh(box, globalMaterial);
    uwbMesh.matrix.scale(new THREE.Vector3(0.5, 0.5, 0.5));

    let uwbGeo = new THREE.Geometry();
    uwbGeo.merge(textMesh.geometry, textMesh.matrix);
    uwbGeo.merge(uwbMesh.geometry, uwbMesh.matrix);
    uwbGeo.computeVertexNormals();

    const uwbBuff = new THREE.BufferGeometry().fromGeometry(uwbGeo);
    this.uwb = new THREE.Mesh(uwbBuff, globalMaterial);

    const radians = 135 * (180 / Math.PI);
    // this.uwb.matrix.makeRotationZ(radians);
    this.uwb.userData.id = dbId;
    const uwbDBID = this.idToNumber(dbId);
    this.uwb.dbId = uwbDBID;

    modelBuilder.addMesh(this.uwb);
    const uwbModel = modelBuilder.model;
    const xAxis = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromAxisAngle(xAxis, radians);
    uwbModel.setPlacementTransform(
      new THREE.Matrix4().compose(
        new THREE.Vector3(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0),
        quaternion,
        new THREE.Vector3(1, 1, 1)
      )
    );
    this.objects.set(dbId, uwbModel);
  };

  addNewWorker = async (dbId, position, rotation) => {
    const sceneBuilder = await this.viewer.loadExtension(
      "Autodesk.Viewing.SceneBuilder"
    );
    const modelBuilder = await sceneBuilder.addNewModel({
      modelNameOverride: "box",
      conserveMemory: false,
    });
    let modelGeometry = new THREE.Geometry();
    const globalMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0, 0),
    });
    const head = new THREE.SphereGeometry(0.5, 32, 16);
    const body = new THREE.SphereGeometry(0.4, 32, 16);
    const textGeometry = new THREE.TextGeometry(`W: ${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });

    const humanIdMesh = new THREE.Mesh(textGeometry, globalMaterial);
    humanIdMesh.matrix.makeRotationX(-4.7);
    humanIdMesh.matrix.setPosition(new THREE.Vector3(0, 0, 2.8));
    humanIdMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));
    const headMesh = new THREE.Mesh(head, globalMaterial);
    const bodyMesh = new THREE.Mesh(body, globalMaterial);

    headMesh.matrix.setPosition(new THREE.Vector3(0, 0, 2.3));
    headMesh.matrix.scale(new THREE.Vector3(0.5, 0.5, 0.5));

    bodyMesh.matrix.setPosition(new THREE.Vector3(0, 0, 1));
    bodyMesh.matrix.scale(new THREE.Vector3(0.5, 0.5, 2.5));
    modelGeometry.merge(headMesh.geometry, headMesh.matrix);
    modelGeometry.merge(bodyMesh.geometry, bodyMesh.matrix);
    modelGeometry.merge(humanIdMesh.geometry, humanIdMesh.matrix);
    modelGeometry.computeVertexNormals();
    const humanModel = new THREE.BufferGeometry().fromGeometry(modelGeometry);
    this.humanModel = new THREE.Mesh(humanModel, globalMaterial);
    this.humanModel.userData.id = dbId;
    const workerDBID = this.idToNumber(dbId);
    this.humanModel.dbId = workerDBID;
    modelBuilder.addMesh(this.humanModel);

    const workerModel = modelBuilder.model;
    workerModel.setPlacementTransform(
      new THREE.Matrix4().compose(
        new THREE.Vector3(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0),
        new THREE.Quaternion(0, 0, 0, 1),
        new THREE.Vector3(1, 1, 1)
      )
    );
    this.objects.set(dbId, workerModel);
  };

  addRestrictedArea = async (dbId, position, rotation) => {
    const sceneBuilder = await this.viewer.loadExtension(
      "Autodesk.Viewing.SceneBuilder"
    );
    const modelBuilder = await sceneBuilder.addNewModel({
      modelNameOverride: "box",
      conserveMemory: false,
    });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const textGeometry = new THREE.TextGeometry(`R: ${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });

    let restricted = new THREE.Geometry();
    const globalMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0, 0),
    });
    const boxMesh = new THREE.Mesh(box, globalMaterial);
    const textMesh = new THREE.Mesh(textGeometry, globalMaterial);
    textMesh.matrix.makeRotationX(-4.7);
    textMesh.matrix.setPosition(new THREE.Vector3(0, 0.5, 1));
    textMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));
    boxMesh.matrix.scale(new THREE.Vector3(1, 1, 1));

    restricted.merge(boxMesh.geometry, boxMesh.matrix);
    restricted.merge(textMesh.geometry, textMesh.matrix);
    restricted.computeVertexNormals();
    const restrictedGeo = new THREE.BufferGeometry().fromGeometry(restricted);
    this.restrictedArea = new THREE.Mesh(restrictedGeo, globalMaterial);

    this.restrictedArea.userData.id = dbId;
    const restrictedAreaId = this.idToNumber(dbId);
    this.restrictedArea.dbId = restrictedAreaId;
    modelBuilder.addMesh(this.restrictedArea);

    let restrictedAreaModel = modelBuilder.model;
    restrictedAreaModel.setPlacementTransform(
      new THREE.Matrix4().setPosition({
        x: position[0] ?? 0,
        y: position[1] ?? 0,
        z: position[2] ?? 0,
      })
    );
    this.objects.set(dbId, restrictedAreaModel);
  };

  addExcavator = async (dbId, position, rotation) => {
    const sceneBuilder = await this.viewer.loadExtension(
      "Autodesk.Viewing.SceneBuilder"
    );
    const modelBuilder = await sceneBuilder.addNewModel({
      modelNameOverride: "box",
      conserveMemory: false,
    });

    const globalMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0, 0),
    });
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
    textMesh.matrix.makeRotationX(-4.7);
    textMesh.matrix.setPosition(new THREE.Vector3(0, 0.5, 1));
    textMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));

    const excavatorMesh = new THREE.Mesh(boxGeometry, globalMaterial);
    excavatorMesh.matrix.scale(new THREE.Vector3(2, 2, 1));

    let excavatorGeo = new THREE.Geometry();
    excavatorGeo.merge(textMesh.geometry, textMesh.matrix);
    excavatorGeo.merge(excavatorMesh.geometry, excavatorMesh.matrix);
    excavatorGeo.computeVertexNormals();

    const excavatorBuffer = new THREE.BufferGeometry().fromGeometry(
      excavatorGeo
    );
    this.excavator = new THREE.Mesh(excavatorBuffer, excavatorMaterial);

    this.excavator.userData.id = dbId;
    const excavatorId = this.idToNumber(dbId);
    this.excavator.dbId = excavatorId;
    modelBuilder.addMesh(this.excavator);

    let excavatorModel = modelBuilder.model;
    excavatorModel.setPlacementTransform(
      new THREE.Matrix4().setPosition({
        x: position.x ?? 0,
        y: position.y ?? 0,
        z: position.z ?? 0,
      })
    );
    this.objects.set(dbId, excavatorModel);
  };

  addBeacon = async (dbId, position, rotation) => {
    const sceneBuilder = await this.viewer.loadExtension(
      "Autodesk.Viewing.SceneBuilder"
    );
    const modelBuilder = await sceneBuilder.addNewModel({
      modelNameOverride: "box",
      conserveMemory: false,
    });

    const sphere = new THREE.SphereGeometry(0.3, 32, 16);
    const textGeometry = new THREE.TextGeometry(`B${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });
    const globalMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0, 0),
    });
    const textMesh = new THREE.Mesh(textGeometry, globalMaterial);
    const beaconMesh = new THREE.Mesh(sphere, globalMaterial);
    // Setup Human Position
    textMesh.matrix.makeRotationX(-4.7);
    textMesh.matrix.setPosition(new THREE.Vector3(0, 0.5, 1));
    textMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));
    let beaconGeo = new THREE.Geometry();
    beaconGeo.merge(textMesh.geometry, textMesh.matrix);
    beaconGeo.merge(beaconMesh.geometry, beaconMesh.matrix);
    beaconGeo.computeVertexNormals();

    const beaconBuffer = new THREE.BufferGeometry().fromGeometry(beaconGeo);
    this.beacon = new THREE.Mesh(beaconBuffer, globalMaterial);

    this.beacon.userData.id = dbId;
    const beaconId = this.idToNumber(dbId);
    this.beacon.dbId = beaconId;
    modelBuilder.addMesh(this.beacon);

    let beaconModel = modelBuilder.model;
    beaconModel.setPlacementTransform(
      new THREE.Matrix4().setPosition({
        x: position[0] ?? 0,
        y: position[1] ?? 0,
        z: position[2] ?? 0,
      })
    );
    this.objects.set(dbId, beaconModel);
  };

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
      console.log("no object on this scene !");
    }
  }

  lookAtMe(modelBuilder, dbId) {
    console.log(modelBuilder);
    this.objects[dbId].matrix.makeRotationFromQuaternion(
      this.viewer.getCamera().clone().quaternion
    );
    modelBuilder.updateMesh(this.objects[dbId]);
  }

  destroy(modelBuilder) {
    for (const property in this.objects) {
      modelBuilder.removeMesh(this.objects[property]);
    }
  }
}
