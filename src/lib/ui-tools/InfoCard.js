export class InfoCardUI {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
  }

  infoCardStup() {
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
      } else {
        this.enabledIcon = false;
      }
    });
    this.container.append(infoModel, infoModelLabel);
  }

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }
}
