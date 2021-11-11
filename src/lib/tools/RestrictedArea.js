export class RestrictedArea {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
    this.selectedModelRA = null;
  }

  restrictedAreaSetup() {
    const form = document.createElement("form");
    form.setAttribute("id", "myform");
    const containerInput = document.createElement("div");
    containerInput.className = "containerInput";
    const title = document.createElement("div");
    title.className = "title-form";
    title.innerText = "Restricted Area Setup";
    const inputPosX = document.createElement("input");
    const inputPosY = document.createElement("input");
    const inputPosZ = document.createElement("input");
    const inputHeight = document.createElement("input");
    const inputRotation = document.createElement("input");
    const labelRotation = document.createElement("label");
    const labelX = document.createElement("label");
    const labelY = document.createElement("label");
    const labelZ = document.createElement("label");
    const labelHeight = document.createElement("label");
    this.setAttributes(labelX, { for: "x" });
    labelX.innerText = "x";
    this.setAttributes(labelY, { for: "y" });
    labelY.innerText = "y";
    this.setAttributes(labelZ, { for: "z" });
    labelZ.innerText = "z";
    this.setAttributes(inputRotation, { for: "angle" });
    labelRotation.innerText = "d";
    this.setAttributes(labelHeight, { for: "h" });
    labelHeight.innerText = "H";

    this.setAttributes(inputHeight, {
      name: "h",
      id: "h",
      type: "number",
      value: 0,
      class: "input-height",
    });

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
    submit.innerText = "Set";
    containerInput.append(
      labelX,
      inputPosX,
      labelY,
      inputPosY,
      labelZ,
      inputPosZ,
      labelHeight,
      inputHeight
    );

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueRA_X = form.elements.namedItem("x").value;
      this.valueRA_Y = form.elements.namedItem("y").value;
      this.valueRA_Z = form.elements.namedItem("z").value;
      this.valueRA_H = form.elements.namedItem("h").value;
      console.log(this.valueRA_H);
      if (
        !isNaN(this.valueRA_X) &&
        this.valueRA_X !== "" &&
        this.valueRA_X !== undefined &&
        !isNaN(this.valueRA_Y) &&
        this.valueRA_Y !== "" &&
        this.valueRA_Y !== undefined &&
        !isNaN(this.valueRA_Z) &&
        this.valueRA_Z !== "" &&
        this.valueRA_Z !== undefined &&
        !isNaN(this.valueRA_H) &&
        this.valueRA_H !== "" &&
        this.valueRA_H !== undefined
      ) {
        if (this.selectedModelRA) {
          this.translation = new THREE.Matrix4().makeTranslation(
            this.valueRA_X,
            this.valueRA_Y,
            this.valueRA_Z
          );
          this.scale = new THREE.Matrix4().scale(
            new THREE.Vector3(1, 1, this.valueRA_H)
          );

          this.selectedModelRA.setPlacementTransform(
            this.translation.multiply(this.scale)
          );
        }
      }
    });

    form.append(containerInput, submit);
    this.container.append(title, form);
  }

  RASelected(model) {
    this.selectedModelRA = model;
  }

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }
}
