import { BeeInventorModel } from "../BeeInventorModel";
import { CoordinateConverter } from "../CoordinateConverter";

export class AOAtools {
  constructor(viewer, container, options, selfOption) {
    this.viewer = viewer;
    this.container = container;
    this.options = options;
    this.beeController = selfOption.controllerModel;
    this.selectedModel = null;
    // AOA Initial Setup
    this.aoa = {
      id: "4219",
      position: [0, 0, 7],
      rotation: [0, 0, 0],
    };
  }

  AOAsetup() {
    const form = document.createElement("form");
    form.setAttribute("id", "myform");
    const containerInput = document.createElement("div");
    containerInput.className = "containerInput";
    const title = document.createElement("div");
    title.className = "title-form";
    title.innerText = "AOA Setup";
    const inputPosX = document.createElement("input");
    const inputPosY = document.createElement("input");
    const inputPosZ = document.createElement("input");
    const inputRotation = document.createElement("input");
    const labelRotation = document.createElement("label");
    const labelX = document.createElement("label");
    const labelY = document.createElement("label");
    const labelZ = document.createElement("label");
    this.setAttributes(labelX, { for: "x" });
    labelX.innerText = "x";
    this.setAttributes(labelY, { for: "y" });
    labelY.innerText = "y";
    this.setAttributes(labelZ, { for: "z" });
    labelZ.innerText = "z";
    this.setAttributes(inputRotation, { for: "angle" });
    labelRotation.innerText = "d";
    this.setAttributes(inputRotation, {
      name: "angle",
      id: "angle",
      type: "number",
      value: 0,
      class: "input-rotation",
    });

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
      labelX,
      inputPosX,
      labelY,
      inputPosY,
      labelZ,
      inputPosZ
    );
    const createAOA = document.createElement("button");
    this.setAttributes(createAOA, {
      class: "create-aoa",
    });
    createAOA.innerText = "Add";

    const deleteAOA = document.createElement("button");
    this.setAttributes(deleteAOA, {
      class: "delete-aoa",
    });
    deleteAOA.innerText = "Delete";

    const angleSubmit = document.createElement("div");
    angleSubmit.className = "submit-setup";
    angleSubmit.append(labelRotation, inputRotation, submit);
    form.append(containerInput, angleSubmit);

    createAOA.addEventListener("click", () => {
      this.beeController.addUWB(
        this.aoa.id,
        this.aoa.position,
        this.aoa.rotation
      );
    });

    deleteAOA.addEventListener("click", () => {
      this.viewer.impl.unloadModel(this.selectedModel);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueAOA_X = form.elements.namedItem("x").value;
      this.valueAOA_Y = form.elements.namedItem("y").value;
      this.valueAOA_Z = form.elements.namedItem("z").value;
      this.valueAOA_Rotation = form.elements.namedItem("angle").value;
      if (
        !isNaN(this.valueAOA_X) &&
        this.valueAOA_X !== "" &&
        this.valueAOA_X !== undefined &&
        !isNaN(this.valueAOA_Y) &&
        this.valueAOA_Y !== "" &&
        this.valueAOA_Y !== undefined &&
        !isNaN(this.valueAOA_Z) &&
        this.valueAOA_Z !== "" &&
        this.valueAOA_Z !== undefined &&
        !isNaN(this.valueAOA_Rotation) &&
        this.valueAOA_Rotation !== "" &&
        this.valueAOA_Rotation !== undefined
      ) {
        if (this.selectedModel) {
          const translation = new THREE.Matrix4().makeTranslation(
            this.valueAOA_X,
            this.valueAOA_Y,
            this.valueAOA_Z
          );

          const angleRadian = CoordinateConverter.degreeToRadian(
            this.valueAOA_Rotation
          );
          const rotationAOA = new THREE.Matrix4().makeRotationZ(angleRadian);
          this.selectedModel.setPlacementTransform(
            translation.multiply(rotationAOA)
          );
        }
      }
    });
    this.container.append(title, form, createAOA, deleteAOA);
  }

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }

  AOASelected(selectedModel) {
    this.selectedModel = selectedModel;
  }

  AOAclear() {
    this.selectedModel = null;
  }
}
