export class DarkMode {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
  }

  darkModeToolSetup() {
    const darkModeTool = document.createElement("input");
    const darkModeLabel = document.createElement("label");

    darkModeLabel.innerText = "Dark Mode";

    this.setAttributes(darkModeTool, {
      type: "checkbox",
      id: "toggleDarkmode",
    });

    darkModeTool.addEventListener("change", () => {
      if (darkModeTool.checked) {
        this.activate();
      } else {
        this.deactivate();
      }
    });

    this.container.append(darkModeTool, darkModeLabel);
  }

  activate() {
    console.log("dark mode activate");
    this.viewer.setBackgroundColor(0, 0, 0, 61, 61, 61);
  }

  deactivate() {
    console.log("dark mode deactivate");
    this.viewer.setBackgroundColor(255, 255, 255, 255, 255, 255);
  }

  setAttributes(el, attrs) {
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }
}
