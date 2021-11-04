const TransformToolName = "xform-tool";
const TransformToolOverlay = "xform-tool-overlay";

export class TransformTool extends Autodesk.Viewing.ToolInterface {
  constructor(viewer) {
    super(viewer);
    /** @type {THREE.TransformControls} */
    this._controls = null;
    /** @type {Autodesk.Viewing.Viewer3D} */
    this._viewer = viewer;

    this._fragments = [];
    this._startPosition = new THREE.Vector3();
    this._onCameraChange = this._onCameraChange.bind(this);
    this._onControlsChange = this._onControlsChange.bind(this);
    this._onSelectionChange = this._onSelectionChange.bind(this);

    this.selectedModel = null;
    this.names = [TransformToolName];
    // Hack: delete functions defined *on the instance* of the tool.
    // We want the tool controller to call our class methods instead.
    delete this.register;
    delete this.deregister;
    delete this.activate;
    delete this.deactivate;
    delete this.getPriority;
    delete this.handleMouseMove;
    delete this.handleButtonDown;
    delete this.handleButtonUp;
    delete this.handleSingleClick;
  }

  register() {
    console.log("TransformTool registered.");
  }

  deregister() {
    console.log("TransformTool unregistered.");
  }

  activate(name, viewer) {
    this._viewer = viewer;

    this._controls = new THREE.TransformControls(
      this._viewer.getCamera(),
      this._viewer.canvas,
      "translate"
    );
    this._controls.setSize(25.0);
    this._controls.visible = false;
    this._controls.addEventListener("change", this._onControlsChange);
    this._controls.attach(new THREE.Object3D()); // haaaack
    this._viewer.select(null);
    this._viewer.addEventListener(
      Autodesk.Viewing.CAMERA_CHANGE_EVENT,
      this._onCameraChange
    );

    this._viewer.addEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this._onSelectionChange
    );

    this._viewer.overlays.addScene(TransformToolOverlay);
    this._viewer.overlays.addMesh(this._controls, TransformToolOverlay);
    console.log("TransformTool activated.");
  }

  deactivate(name) {
    this._viewer.overlays.removeMesh(this._controls, TransformToolOverlay);
    this._viewer.overlays.removeScene(TransformToolOverlay);
    this._viewer.removeEventListener(
      Autodesk.Viewing.CAMERA_CHANGE_EVENT,
      this._onCameraChange
    );

    this._viewer.removeEventListener(
      Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
      this._onSelectionChange
    );
    this._controls.removeEventListener("change", this._onControlsChange);
    this._viewer = null;
    this._controls = null;
    console.log("TransformTool deactivated.");
  }

  getPriority() {
    return 42; // Or feel free to use any number higher than 0 (which is the priority of all the default viewer tools)
  }

  update(highResTimestamp) {
    return false;
  }

  handleMouseMove(event) {
    if (this._dragging) {
      return this._controls.onPointerMove(event);
    } else {
      return this._controls.onPointerHover(event);
    }
  }

  handleButtonDown(event, button) {
    this._dragging = true;
    return this._controls.onPointerDown(event);
  }

  handleButtonUp(event, button) {
    this._dragging = false;
    return this._controls.onPointerUp(event);
  }

  handleSingleClick(event, button) {
    return false;
  }

  _onCameraChange() {
    this._controls.update();
  }

  _onControlsChange(ev) {
    if (this.selectedModel) {
      const posTransform = this._controls.position;
      let tr = this.selectedModel.getPlacementTransform();
      tr.elements[12] = posTransform.x;
      tr.elements[13] = posTransform.y;
      tr.elements[14] = posTransform.z;
      this.selectedModel.setPlacementTransform(tr);

      this._viewer.impl.invalidate(true, true, true);
    }
  }

  _onSelectionChange(ev) {
    const selSet = ev.selections;
    const firstSel = selSet[0];

    if (firstSel) {
      const listdbIds = firstSel.dbIdArray;
      const dbidItem = listdbIds[0];
      const typeModel = dbidItem.toString().slice(0, 3);
      if (typeModel !== "500") return;

      const model = firstSel.model;
      this.selectedModel = model;
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
      this._controls.setPosition(position);
      this._startPosition.copy(this._controls.position);
      this._controls.visible = true;
    } else {
      this._controls.visible = false;
      this.selectedModel = null;
    }
  }

  _computeBounds(model, fragIds) {
    const frags = model.getFragmentList();
    const totalBounds = new THREE.Box3(),
      fragBounds = new THREE.Box3();
    for (const fragId of fragIds) {
      frags.getWorldBounds(fragId, fragBounds);
      totalBounds.union(fragBounds);
    }
    return totalBounds;
  }
}
