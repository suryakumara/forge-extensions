export class ForgeController {
  constructor(viewer, options) {
    this.viewer = viewer;
    this.objects = new Map();
    this.viewer.loadExtension("Autodesk.glTF");
  }

  addObject(id, position) {
    this.loadWorkerModel(id, position);
  }

  getObject(id) {
    return this.objects.get(id);
  }

  async loadWorkerModel(id, position) {
    await this.viewer.loadModel(
      `${CDN_DOMAIN}/assets/models/human.gltf`,
      {},
      (human) => {
        human.setPlacementTransform(
          new THREE.Matrix4().setPosition({
            x: position[0],
            y: position[1],
            z: position[2],
          })
        );
        this.objects.set(id, human);
      }
    );
  }

  async loadPlantModel(id, position) {
    await this.viewer.loadModel(
      `${CDN_DOMAIN}/assets/models/excavator.gltf`,
      {},
      (plant) => {
        plant.setPlacementTransform(
          new THREE.Matrix4().setPosition({
            x: position.x,
            y: position.y,
            z: 0,
          })
        );
        this.objects.set(id, plant);
      }
    );
  }

  destroy() {
    this.objects.clear();
    this.viewer.destroy();
  }
}
