export class RestrictedArea {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
    this.selectedModelRA = null;
  }

  restrictedAreaSetup() {
    const restrictedArea = document.createElement("div");
    restrictedArea.innerHTML = `
    <div class="container-bee">
    <button type="button" class="collapsible">Restricted Area Setup</button>
    <div class="content">
      <form id="form-edit-restricted">
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
            name="height"
            id="height"
            value="0"
            class="input-position"
          />
          <label for="angle">height (m)</label>
        </div>
        <button type="submit" class="button-bee">SET</button>
      </form>
    </div>
  </div>
    `;

    this.container.append(restrictedArea);
  }

  updateREstricted() {
    const formRestrictedArea = document.getElementById("form-edit-restricted");
    if (!formRestrictedArea) return;

    formRestrictedArea.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueRA_X = formRestrictedArea.elements.namedItem("x").value;
      this.valueRA_Y = formRestrictedArea.elements.namedItem("y").value;
      this.valueRA_Z = formRestrictedArea.elements.namedItem("z").value;
      this.valueRA_H = formRestrictedArea.elements.namedItem("height").value;

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
