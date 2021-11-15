export class ObjectInfo {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
  }

  objectInfoSetup() {
    const infoPanel = document.createElement("div");
    infoPanel.innerHTML = `
    <div class="container-bee">
      <button type="button" class="collapsible">Object Info</button>
      <div class="content">
        <div>Objet Info</div>
        <div>ID: <span id="infoId"></span></div>
        <div>Position: <span id="infoPosition"></span></div>
        <div>Rotation: <span id="infoRotation"></span></div>
        <div>Latitude: <span id="infoLatitude"></span></div>
        <div>Longitude: <span id="infoLongitude" class="info"></span></div>
      </div>
    </div>
        `;

    this.container.append(infoPanel);
  }

  updateInfo(objectInfo) {
    this.infoId = document.getElementById("infoId");
    this.infoPosition = document.getElementById("infoPosition");
    this.infoRotation = document.getElementById("infoRotation");
    this.infoLatitude = document.getElementById("infoLatitude");
    this.infoLongitude = document.getElementById("infoLongitude");
    this.infoId.innerText = objectInfo.id;
    this.infoLatitude.innerText = objectInfo.latitude;
    this.infoLongitude.innerText = objectInfo.longitude;
    this.infoPosition.innerText = objectInfo.position;
    this.infoRotation.innerText = objectInfo.rotation;
  }

  clearInfo() {
    if (this.infoLatitude) this.infoLatitude.innerText = "";
    if (this.infoLongitude) this.infoLongitude.innerText = "";
    if (this.infoId) this.infoId.innerText = "";
    if (this.infoPosition) this.infoPosition.innerText = "";
    if (this.infoRotation) this.infoRotation.innerText = "";
  }
}
