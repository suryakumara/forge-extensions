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
    const aoaContainer = document.createElement("div");
    aoaContainer.innerHTML = `
    <div class="container-bee">
    <button type="button" class="collapsible">AOA Setup</button>
    <div class="content">
      <div class="aoa-bee">
        <form id="form-add-aoa">
          <input
            type="text"
            name="aoa-id"
            id="aoa-id"
            class="input-position"
          />
          <label for="aoa-id">aoa-tag</label>
          <button class="button-bee-aoa aoa-config" id="create-aoa">
            ADD
          </button>
        </form>
        <button class="button-bee-aoa aoa-config" id="delete-aoa">DELETE</button>
      </div>
      <form id="form-edit-aoa">
        <div>
          <input
            type="number"
            name="x"
            id="x"
            value="0"
            class="input-position"
          />
          <label for="x">x (m)</label>
        </div>
        <div>
          <input
            type="number"
            name="y"
            id="y"
            value="0"
            class="input-position"
          />
          <label for="y">y (m)</label>
        </div>
        <div>
          <input
            type="number"
            name="z"
            id="z"
            value="0"
            class="input-position"
          />
          <label for="z">z (m)</label>
        </div>
        <div>
          <input
            type="number"
            name="angle"
            id="angle"
            value="0"
            class="input-position"
          />
          <label for="angle">angle (&deg)</label>
        </div>
        <button type="submit" class="button-bee">SET</button>
      </form>
    </div>
  </div>
    `;
    this.container.append(aoaContainer);
  }

  AOAexistence() {
    const formCreateAOA = document.getElementById("form-add-aoa");
    if (!formCreateAOA) return;

    formCreateAOA.addEventListener("submit", (e) => {
      e.preventDefault();
      this.id_AOA = formCreateAOA.elements.namedItem("aoa-id").value;
      if (this.id_AOA !== "" && this.id_AOA !== undefined) {
        this.beeController.addAOA(
          this.id_AOA ?? this.aoa.position,
          this.aoa.position,
          this.aoa.rotation
        );
      } else {
        alert("Id is not correct");
      }
    });

    const deleteAOA = document.getElementById("delete-aoa");
    if (!deleteAOA) return;

    deleteAOA.addEventListener("click", () => {
      if (this.selectedModel) {
        this.viewer.impl.unloadModel(this.selectedModel);
      } else {
        alert("There is no AOA selected!");
      }
    });
  }

  updateAOA() {
    const formEditAOA = document.getElementById("form-edit-aoa");
    if (!formEditAOA) return;

    formEditAOA.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueAOA_X = formEditAOA.elements.namedItem("x").value;
      this.valueAOA_Y = formEditAOA.elements.namedItem("y").value;
      this.valueAOA_Z = formEditAOA.elements.namedItem("z").value;
      this.valueAOA_Rotation = formEditAOA.elements.namedItem("angle").value;
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
