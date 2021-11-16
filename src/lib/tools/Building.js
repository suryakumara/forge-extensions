import { CoordinateConverter } from "../CoordinateConverter";

export class Building {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
  }

  buildingSetup() {
    const containerInput = document.createElement("div");
    containerInput.innerHTML = `
    <div class="container-bee">
    <button type="button" class="collapsible"><div class="glyphicon glyphicon-blackboard"/><span>Building Setup</span></button>
    <div class="content">
      <div class="latlong-bee">
        <div id="lat-bee">Lat :</div>
        <div id="long-bee">Long :</div>
      </div>

      <form id="form-building">
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
      <div class="button-bee" id="button-show-hide-building">
        SHOW/HIDE BUILDING
      </div>
    </div>
  </div>
    `;
    this.container.append(containerInput);
  }

  updateBuilding() {
    const formBuilding = document.getElementById("form-building");

    if (!formBuilding) return;

    formBuilding.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueX = formBuilding.elements.namedItem("x").value;
      this.valueY = formBuilding.elements.namedItem("y").value;
      this.valueZ = formBuilding.elements.namedItem("z").value;
      this.valueRot = formBuilding.elements.namedItem("angle").value;
      if (
        !isNaN(this.valueX) &&
        this.valueX !== "" &&
        this.valueX !== undefined &&
        !isNaN(this.valueY) &&
        this.valueY !== "" &&
        this.valueY !== undefined &&
        !isNaN(this.valueZ) &&
        this.valueZ !== "" &&
        this.valueZ !== undefined &&
        !isNaN(this.valueRot) &&
        this.valueRot !== "" &&
        this.valueRot !== undefined
      ) {
        this.translation = new THREE.Matrix4().makeTranslation(
          this.valueX,
          this.valueY,
          this.valueZ
        );
        const angleRadian = CoordinateConverter.degreeToRadian(this.valueRot);
        let rotate = new THREE.Matrix4().makeRotationZ(angleRadian);
        this.viewer.model.setPlacementTransform(
          this.translation.multiply(rotate)
        );
      }
    });
  }

  updateLatLong(position) {
    const lat = document.getElementById("lat-bee");
    const long = document.getElementById("long-bee");

    if (!lat || !long) return;

    lat.innerText = `Lat : ${position.latitude}`;
    long.innerText = `Long: ${position.longitude}`;
  }

  updateVisibility() {
    const buttonVisibility = document.getElementById(
      "button-show-hide-building"
    );
    if (!buttonVisibility) return;
    buttonVisibility.addEventListener("click", async () => {
      this.enabled = !this.enabled;
      if (this.enabled) {
        const instanceTree = this.viewer.model.getData().instanceTree;
        const rootId = instanceTree.getRootId();
        this.viewer.hide(rootId);
      } else {
        const instanceTree = this.viewer.model.getData().instanceTree;
        const rootId = instanceTree.getRootId();
        this.viewer.show(rootId);
      }
    });
  }

  buildingVisibility() {
    const buttonVisibility = document.createElement("div");
    buttonVisibility.innerText = "Show/Hide Building";
    buttonVisibility.classList.add("button-bee");
    buttonVisibility.addEventListener("click", async () => {
      this.enabled = !this.enabled;
      if (this.enabled) {
        const instanceTree = this.viewer.model.getData().instanceTree;
        const rootId = instanceTree.getRootId();
        this.viewer.hide(rootId);
      } else {
        const instanceTree = this.viewer.model.getData().instanceTree;
        const rootId = instanceTree.getRootId();
        this.viewer.show(rootId);
      }
    });
    this.container.append(buttonVisibility);
  }

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }
}
