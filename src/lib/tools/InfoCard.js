export class InfoCardUI {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
    this.infoCard = null;
    this.enabledIcon = false;
  }

  updateIconEvent() {
    const updateIconsCallback = () => {
      if (this.enabledIcon) {
        this.updateIcons();
      }
    };

    this.viewer.addEventListener(
      Autodesk.Viewing.CAMERA_CHANGE_EVENT,
      updateIconsCallback
    );
    this.viewer.addEventListener(
      Autodesk.Viewing.ISOLATE_EVENT,
      updateIconsCallback
    );
    this.viewer.addEventListener(
      Autodesk.Viewing.HIDE_EVENT,
      updateIconsCallback
    );
    this.viewer.addEventListener(
      Autodesk.Viewing.SHOW_EVENT,
      updateIconsCallback
    );
  }

  unload() {
    console.log("unload");
  }

  infoCardSetup() {
    const infoModel = document.createElement("input");
    const infoModelLabel = document.createElement("label");

    infoModelLabel.innerText = "Info Model";

    this.setAttributes(infoModel, {
      type: "checkbox",
      id: "toggleInfoModel",
    });

    infoModel.addEventListener("change", () => {
      if (infoModel.checked) {
        this.enabledIcon = true;
        console.log("infoCard activated");
      } else {
        this.enabledIcon = false;
        console.log("InfoCard deactivated");
        this.clearInfoCard();
      }
    });
    this.container.append(infoModel, infoModelLabel);
  }

  showIcon(dbId, objectInfo, posModel) {
    this.posModel = posModel;
    if (!this.enabledIcon) return;

    this.infoCard = document.createElement("div");
    this.infoCard.setAttribute("class", "labelModel");
    this.infoCard.setAttribute("data-id", `${dbId}`);

    let infoData = document.createElement("div");
    infoData.id = "infoData";
    if (objectInfo) {
      infoData.innerHTML = `
      <div>ID: <span id="infoId">${objectInfo.id}</span></div>
      <div>Position: <span id="infoPosition" >${objectInfo.position}</span></div>
      <div>Rotation: <span id="infoRotation" >${objectInfo.rotation}</span></div>
      <div>Lat: <span id="infoLatitude" >${objectInfo.latitude}</span></div>
      <div>Long: <span id="infoLongitude" class="info">${objectInfo.longitude}</span></div>

      `;
      // <div style="width: 50px; height: 50px; background-color: #fff; margin: 10px auto 0;">
      //   <img
      //     src="/assets/images/png/img_gps_dasloop_online.png"
      //     style="max-width: 100%; max-height: 100%;"
      //   />
      // </div>;
    }

    this.infoCard.append(infoData);
    const viewerContainer = document.querySelector(
      `#${this.viewer.clientContainer.id}`
    );
    viewerContainer.appendChild(this.infoCard);

    this.updateIcons();
  }

  updateIcons() {
    if (this.infoCard && this.posModel) {
      const pos = this.viewer.worldToClient(this.posModel);
      this.infoCard.style.left = `${Math.floor(
        50 + pos.x - this.infoCard.offsetWidth / 2
      )}px`;
      this.infoCard.style.top = `${Math.floor(
        50 + pos.y - this.infoCard.offsetWidth / 2
      )}px`;
      const id = this.infoCard.dataset.id;
      this.infoCard.style.display = this.viewer.isNodeVisible(id)
        ? "block"
        : "none";
    }
  }

  clearInfoCard() {
    if (this.infoCard) {
      this.infoCard.remove();
    }
  }

  clear() {
    this.infoCard = null;
  }

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }
}
