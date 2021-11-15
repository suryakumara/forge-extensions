export class MainConverter {
  static getTypeOfModel(dbId) {
    // model only receive int number
    // tThus, after clicked the selected model need to convert and give an ID
    let idDevice = "";
    const typeModel = dbId.slice(0, 4);
    switch (typeModel) {
      case "5001":
        idDevice = dbId.replace(/^.{4}/g, "AOA-");
        break;
      case "5002":
        idDevice = dbId.replace(/^.{4}/g, "Worker-");
        break;
      case "5003":
        idDevice = dbId.replace(/^.{4}/g, "RA-");
        break;
      case "5004":
        idDevice = dbId.replace(/^.{4}/g, "EXT-");
        break;
      case "5005":
        idDevice = dbId.replace(/^.{4}/g, "BCN-");
        break;
      default:
        idDevice = dbId;
        break;
    }
    return { idDevice };
  }

  static idToNumber(id) {
    const numberId = parseInt(id.replace(/[^0-9]/g, ""));
    return numberId;
  }

  static quaternionToAngle = (rotatedMatrix) => {
    let vec = new THREE.Quaternion();
    vec.setFromRotationMatrix(rotatedMatrix);
    const _w = vec._w;
    let angleRadian = 2 * Math.acos(_w);
    const angle = (angleRadian * 180) / Math.PI;
    return { angle };
  };

  static getRotationModel(rotatedMatrix) {
    const Vx = rotatedMatrix.elements[0];
    const Vy = rotatedMatrix.elements[1];

    let radians;
    if (Vx || Vy) {
      radians = Math.atan2(Vy, Vx);
    } else {
      radians = 0;
    }

    if (radians < 0) {
      radians += 2 * Math.PI;
    }
    const radiansToDegree = Math.round(radians * (180 / Math.PI));
    return { angle: radiansToDegree };
  }
}
