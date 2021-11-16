export class RotateCamera {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
    this.started = false;
  }

  rotateCameraSetup() {
    const rotateCameraContainer = document.createElement("div");
    const rotateCameraInput = document.createElement("input");
    const rotateCameraLabel = document.createElement("label");

    rotateCameraLabel.innerText = "Rotate Camera";

    this.setAttributes(rotateCameraInput, {
      type: "checkbox",
      id: "toggleRotate",
    });

    rotateCameraContainer.append(rotateCameraInput, rotateCameraLabel);
    rotateCameraInput.addEventListener("change", () => {
      if (rotateCameraInput.checked) {
        this.started = true;
        this.rotateCamera();
        console.log("activate rotated camera");
      } else {
        this.started = false;
        console.log("unactivate rotated camera");
      }
    });
    this.container.append(rotateCameraContainer);
  }

  rotateCamera = () => {
    if (this.started) {
      requestAnimationFrame(this.rotateCamera);
    }

    const nav = this.viewer.navigation;
    const up = nav.getCameraUpVector();
    const axis = new THREE.Vector3(0, 0, 1);
    const speed = (10.0 * Math.PI) / 180;
    const matrix = new THREE.Matrix4().makeRotationAxis(axis, speed * 0.03);

    let pos = nav.getPosition();
    pos.applyMatrix4(matrix);
    up.applyMatrix4(matrix);
    nav.setView(pos, new THREE.Vector3(0, 0, 0));
    nav.setCameraUpVector(up);
    this.viewer.getState();
  };

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }
}
