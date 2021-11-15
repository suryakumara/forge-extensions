export class GeneralTool {
  constructor(viewer, container) {
    this.viewer = viewer;
    this.container = container;
  }

  setUpGeneralTool() {
    const genTool = document.createElement("div");
    genTool.innerHTML = `
    <div class="container-bee">
    <button type="button" class="collapsible">General Tool</button>
    <div class="content">
      <div class="general-tool-bee" id="general-tool">
      </div>
    </div>
  </div>
    `;
    this.container.append(genTool);
  }

  activateGeneralTool() {
      
    // InfoCard Setup
    this.infoCardTool = new InfoCardUI(this.viewer, this.containerGeneralTool);
    this.infoCardTool.infoCardSetup();
    this.infoCardTool.updateIconEvent(this.posModel);

    // Transform Setup
    this.transformTool = new TransformToolUI(
      this.viewer,
      this.containerGeneralTool
    );
    this.transformTool.transformToolSetup();

    // Dark Mode Setup
    this.darkMode = new DarkMode(this.viewer, this.containerGeneralTool);
    this.darkMode.darkModeToolSetup();

    // Rotate Camera Setup
    this.rotateCamera = new RotateCamera(
      this.viewer,
      this.containerGeneralTool
    );
    this.rotateCamera.rotateCameraSetup();
  }
}
