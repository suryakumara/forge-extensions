import { BeeInventorPanel } from "./lib/BeeInventorPanel";
import "./css/main.css";

/* global Autodesk THREE */
class BeeInventor extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.viewer = viewer;
    this.options = options;
    this._button = null;
    this._group = null;
    this.panel = null;
    this.grid = null;
  }

  load() {
    console.log("Docking Panel has been loaded !");
    this.grid = new THREE.GridHelper(50, 1);
    this.grid.material.opacity = 0.8;
    this.grid.material.transparent = true;
    this.grid.position.set(0, 0, 0);
    this.grid.rotateX(Math.PI / 2);
    if (!this.viewer.overlays.hasScene("grid")) {
      this.viewer.overlays.addScene("grid");
    }
    this.viewer.overlays.addMesh(this.grid, "grid");
    return true;
  }

  unload() {
    console.log("Docking Panel has been unloaded !");
    if (this.viewer.toolbar !== null)
      this.viewer.toolbar.removeControl(this.subToolbar);
    if (this.panel !== null) this.panel.setVisible(false);
    if (this._group) {
      this._group.removeControl(this._button);
      if (this._group.getNumberOfControls() === 0) {
        this.viewer.toolbar.removeControl(this._group);
      }
    }
    return true;
  }

  onToolbarCreated() {
    this._group = this.viewer.toolbar.getControl("BeeInventorToolbar");
    if (!this._group) {
      this._group = new Autodesk.Viewing.UI.ControlGroup("BeeInventorToolbar");
      this.viewer.toolbar.addControl(this._group);
    }
    this._button = new Autodesk.Viewing.UI.Button("Docking Panel");
    this._button.onClick = () => {
      if (this.panel === null) {
        this.panel = new BeeInventorPanel(
          this.viewer,
          this.viewer.container,
          "beeInventor",
          "BeeInventor Extension"
        );
      }

      this.panel.setVisible(!this.panel.isVisible());
    };
    this._button.setToolTip("BeeInventor IoT");
    this._button.addClass("dockingPanel");
    this._group.addControl(this._button);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  "BeeInventor",
  BeeInventor
);
