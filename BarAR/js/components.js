/* Global A-Frame components used by the AR scene. */
(function () {
  var THREE = AFRAME.THREE;

  /**
   * Gentle idle motion for the SARA character: a small bob plus a light sway.
   * The cocktail is a sibling inside the idle holder, so it moves with her.
   */
  AFRAME.registerComponent('sara-idle', {
    schema: {
      amplitude: { default: 0.03 },
      speed: { default: 1.55 },
      sway: { default: 0.035 }
    },

    init: function () {
      this.baseY = this.el.object3D.position.y;
      this.time = 0;
    },

    tick: function (time, delta) {
      this.time += (delta || 16) / 1000;
      var t = this.time;
      this.el.object3D.position.y = this.baseY + Math.sin(t * this.data.speed) * this.data.amplitude;
      this.el.object3D.rotation.y = Math.sin(t * 0.55) * this.data.sway;
    }
  });

  /**
   * Keeps the character upright while yawing it toward the camera, no matter
   * how the tracked menu card is oriented in the real world.
   */
  AFRAME.registerComponent('face-camera', {
    init: function () {
      this.worldPos = new THREE.Vector3();
      this.cameraPos = new THREE.Vector3();
    },

    tick: function () {
      if (!this.el.object3D.visible) return;
      var scene = this.el.sceneEl;
      var camera = scene && scene.camera;
      if (!camera) return;

      var obj = this.el.object3D;
      obj.updateWorldMatrix(true, false);
      obj.getWorldPosition(this.worldPos);
      camera.getWorldPosition(this.cameraPos);
      obj.lookAt(this.cameraPos.x, this.worldPos.y, this.cameraPos.z);
    }
  });
})();
