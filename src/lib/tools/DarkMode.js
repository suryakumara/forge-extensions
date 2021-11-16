export class DarkMode {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
  }

  darkModeToolSetup() {
    const darkModeContainer = document.createElement("div");
    const darkModeInput = document.createElement("input");
    const darkModeLabel = document.createElement("label");
    darkModeLabel.innerText = "Dark Mode";

    this.setAttributes(darkModeInput, {
      type: "checkbox",
      id: "toggleDarkmode",
    });
    darkModeContainer.append(darkModeInput, darkModeLabel);
    darkModeInput.addEventListener("change", () => {
      if (darkModeInput.checked) {
        this.activate();
      } else {
        this.deactivate();
      }
    });

    this.container.append(darkModeContainer);
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
