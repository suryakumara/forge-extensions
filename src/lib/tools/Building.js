import { CoordinateConverter } from "../CoordinateConverter";

export class Building {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
  }

  buildingSetup(geoBuilding) {
    const containerInput = document.createElement("div");
    containerInput.innerHTML = `
    <button type="button" class="collapsible">Building Setup</button>
    <form class="content" id="form-building">
      <div>
        <input
          type="number"
          name="x"
          id="x"
          type="number"
          value="0"
          class="input-position"
        />
        <label for="x">x</label>
      </div>
      <div>
        <input
          type="number"
          name="y"
          id="y"
          type="number"
          value="0"
          class="input-position"
        />
        <label for="y">y</label>
      </div>
      <div>
        <input
          type="number"
          name="z"
          id="z"
          type="number"
          value="0"
          class="input-position"
        />
        <label for="z">z</label>
      </div>
      <div>
        <input
          type="number"
          name="angle"
          id="angle"
          type="number"
          value="0"
          class="input-position"
        />
        <label for="angle">angle</label>
      </div>
      <button type="submit" id>set</button>
    </form>
    `;

    const coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
      coll[i].addEventListener("click", function () {
        coll[i].classList.toggle("active");
        const content = coll[i].nextElementSibling;
        if (content.style.display === "block") {
          content.style.display = "none";
        } else {
          content.style.display = "block";
        }
      });
    }

    const formBuilding = document.getElementById("form-building");
    formBuilding.addEventListener("submit", (e) => {
      e.preventDefault();
      this.valueX = form.elements.namedItem("x").value;
      this.valueY = form.elements.namedItem("y").value;
      this.valueZ = form.elements.namedItem("z").value;
      this.valueRot = form.elements.namedItem("angle").value;
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

    const latLongCenter = document.createElement("div");
    latLongCenter.classList.add("latlong-bee");
    const position = geoBuilding;
    latLongCenter.innerText = `Lat: ${position.latitude}, Long: ${position.longitude}`;
    this.container.append(containerInput, latLongCenter);
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

  //   updateBuildingRotation() {
  //     const formRotation = document.createElement("form");
  //     formRotation.setAttribute("id", "myformRotation");
  //     const containerRotation = document.createElement("div");
  //     containerRotation.className = "containerRotation";
  //     const inputAngle = document.createElement("input");
  //     const labelAngle = document.createElement("label");
  //     const titleAngle = document.createElement("h6");
  //     const latLongCenter = document.createElement("div");
  //     latLongCenter.classList.add("latlong-bee");

  //     const position = this.coordinateConverter.getCenter();
  //     latLongCenter.innerText = `Lat: ${position.latitude}, Long: ${position.longitude}`;
  //     titleAngle.innerText = "Rotation";
  //     titleAngle.className = "title-rotation";
  //     this.setAttributes(labelAngle, { for: "angle" });
  //     labelAngle.innerText = "angle";
  //     this.setAttributes(inputAngle, {
  //       name: "angle",
  //       id: "angle",
  //       type: "number",
  //       value: 0,
  //       class: "input-rotation",
  //     });
  //     const submitAngle = document.createElement("input");
  //     this.setAttributes(submitAngle, {
  //       type: "submit",
  //       class: "submit-rotation",
  //     });
  //     submitAngle.innerText = "Submit";
  //     containerRotation.append(inputAngle, labelAngle, submitAngle);
  //     formRotation.append(titleAngle, containerRotation);
  //     formRotation.addEventListener("submit", (e) => {
  //       e.preventDefault();
  //       this.angleRotation = formRotation.elements.namedItem("angle").value;
  //       if (
  //         !isNaN(this.angleRotation) &&
  //         this.angleRotation !== "" &&
  //         this.angleRotation !== undefined
  //       ) {
  //         const angleRadian = CoordinateConverter.degreeToRadian(
  //           this.angleRotation
  //         );

  //         this.rotation = new THREE.Matrix4().makeRotationZ(angleRadian);
  //         if (this.translation) {
  //           this.viewer.model.setPlacementTransform(
  //             this.rotation.multiply(this.translation)
  //           );
  //         } else {
  //           this.viewer.model.setPlacementTransform(this.rotation);
  //         }
  //       }
  //     });
  //     this.containerBuilding.append(formRotation);
  //     this.containerBuilding.append(latLongCenter);
  //   }

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }
}
