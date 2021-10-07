export class BeeInventorModel {
  constructor(viewer, options) {
    this.viewer = viewer;
    this.options = options;
    this.position = null;
    this.workerId = null;
    this.workerTagId = null;
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

  addWorkerTag(modelBuilder, dbId, position) {
    let modelGeometry = new THREE.Geometry();
    const globalMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.SphereGeometry(0.4, 32, 16);
    const textGeometry = new THREE.TextGeometry(`Worker:${dbId}`, {
      font: "monaco",
      size: 1,
      height: 0,
      curveSegments: 3,
    });
    textGeometry.computeBoundingBox();
    const workerTagMesh = new THREE.Mesh(textGeometry, globalMaterial);
    workerTagMesh.matrix.makeRotationX(-4.7);
    workerTagMesh.matrix.setPosition(new THREE.Vector3(0, 0, 2.8));
    workerTagMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));

    const sphereMesh = new THREE.Mesh(sphere, globalMaterial);

    sphereMesh.matrix.setPosition(new THREE.Vector3(0, 0, 2.5));
    sphereMesh.matrix.scale(new THREE.Vector3(0.2, 0.2, 0.2));
    modelGeometry.merge(sphereMesh.geometry, sphereMesh.matrix);
    modelGeometry.merge(workerTagMesh.geometry, workerTagMesh.matrix);
    modelGeometry.computeVertexNormals();
    const workerTagBuffer = new THREE.BufferGeometry().fromGeometry(
      modelGeometry
    );
    this.workerTagId = new THREE.Mesh(workerTagBuffer, globalMaterial);
    this.workerTagId.matrix.setPosition(
      new THREE.Vector3(position[0], position[1], position[2])
    );
    this.workerTagId.userData.id = dbId;
    this.objects[this.workerTagId.userData.id] = this.workerTagId;
    this.workerTagId.dbId = dbId;
    modelBuilder.addMesh(this.workerTagId);
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
    console.log(modelBuilder);
    this.objects[dbId].matrix.makeRotationFromQuaternion(
      this.viewer.getCamera().clone().quaternion
    );
    modelBuilder.updateMesh(this.objects[dbId]);
  }
}
