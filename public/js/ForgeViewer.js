﻿/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

var viewer;

function launchViewer(urn) {
  var options = {
    env: "AutodeskProduction",
    getAccessToken: getForgeToken,
  };

  Autodesk.Viewing.Initializer(options, () => {
    viewer = new Autodesk.Viewing.GuiViewer3D(
      document.getElementById("forgeViewer")
    );
    viewer.start();

    var documentId = "urn:" + urn;
    Autodesk.Viewing.Document.load(
      documentId,
      onDocumentLoadSuccess,
      onDocumentLoadFailure
    );
  });
}

function onDocumentLoadSuccess(doc) {
  var viewables = doc.getRoot().getDefaultGeometry();
  viewer
    .loadDocumentNode(doc, viewables, {
      applyScaling: { to: "meters" },
      globalOffset: { x: 0, y: 0, z: 0 },
      keepCurrentModels: true,
      // placementTransform: new THREE.Matrix4().setPosition({
      //   x: -3.9,
      //   y: -4.85,
      //   z: 0,
      // }),
    })
    .then((i) => {
      // documented loaded, any action?
      var ViewerInstance = new CustomEvent("viewerinstance", {
        detail: { viewer: viewer },
      });
      document.dispatchEvent(ViewerInstance);
      // var LoadExtensionEvent = new CustomEvent("loadextension", {
      //   detail: {
      //     extension: "Extension1",
      //     viewer: viewer
      //   }
      // });
      // document.dispatchEvent(LoadExtensionEvent);
    });
}

function onDocumentLoadFailure(viewerErrorCode) {
  console.error("onDocumentLoadFailure() - errorCode:" + viewerErrorCode);
}

function getForgeToken(callback) {
  fetch("/api/forge/oauth/token").then((res) => {
    res.json().then((data) => {
      callback(data.access_token, data.expires_in);
    });
  });
}
