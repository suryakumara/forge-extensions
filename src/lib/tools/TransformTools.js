import { TransformTool } from "../TransformTool";

const TransformToolName = "xform-tool";

export class TransformToolUI {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
    this._tool = null;
  }

  transformToolSetup() {
    const transfromContainer = document.createElement("div");
    const transformTool = document.createElement("input");
    const transformToolLabel = document.createElement("label");
    transformToolLabel.innerText = "AOA Transform";

    this.setAttributes(transformTool, {
      type: "checkbox",
      id: "toggleTransformTool",
    });
    transfromContainer.append(transformTool, transformToolLabel);
    transformTool.addEventListener("change", () => {
      if (transformTool.checked) {
        this._enableTransformTool();
      } else {
        this._disableTransformTool();
      }
    });
    this.container.append(transfromContainer);
  }

  _enableTransformTool() {
    alert("Please select a AOA in the scene.");
    const controller = this.viewer.toolController;
    if (!this._tool) {
      this._tool = new TransformTool();
      controller.registerTool(this._tool);
    }
    if (!controller.isToolActivated(TransformToolName)) {
      controller.activateTool(TransformToolName);
    }
  }

  _disableTransformTool() {
    const controller = this.viewer.toolController;
    if (this._tool && controller.isToolActivated(TransformToolName)) {
      controller.deactivateTool(TransformToolName);
    }
  }

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }
}
