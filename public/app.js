// app.js - escena de ejemplo que carga texturas locales desde public/assets/textures
window.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true);

  const createScene = function () {
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -15), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);

    var light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    // Rutas locales (coloca tus texturas en public/assets/textures/)
    const base = 'assets/textures/';

    var woodMat = new BABYLON.StandardMaterial('woodMat', scene);
    woodMat.diffuseTexture = new BABYLON.Texture(base + 'wood.jpg', scene);

    var box = BABYLON.MeshBuilder.CreateBox('box', { size: 2 }, scene);
    box.position = new BABYLON.Vector3(-4, 1, 0);
    box.material = woodMat;

    var marbleMat = new BABYLON.StandardMaterial('marbleMat', scene);
    marbleMat.diffuseTexture = new BABYLON.Texture(base + 'marble.jpg', scene);

    var sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene);
    sphere.position = new BABYLON.Vector3(-1.5, 1, 0);
    sphere.material = marbleMat;

    var metalMat = new BABYLON.StandardMaterial('metalMat', scene);
    metalMat.diffuseTexture = new BABYLON.Texture(base + 'metal.jpg', scene);

    var cylinder = BABYLON.MeshBuilder.CreateCylinder('cylinder', { height: 2, diameter: 1.5 }, scene);
    cylinder.position = new BABYLON.Vector3(1.5, 1, 0);
    cylinder.material = metalMat;

    var brickMat = new BABYLON.StandardMaterial('brickMat', scene);
    brickMat.diffuseTexture = new BABYLON.Texture(base + 'brick.jpg', scene);

    var torus = BABYLON.MeshBuilder.CreateTorus('torus', { diameter: 2, thickness: 0.5 }, scene);
    torus.position = new BABYLON.Vector3(4, 1, 0);
    torus.material = brickMat;

    var groundMat = new BABYLON.StandardMaterial('groundMat', scene);
    groundMat.diffuseTexture = new BABYLON.Texture(base + 'grass.jpg', scene);

    var ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 12, height: 12 }, scene);
    ground.material = groundMat;

    

    // --- Movimiento en su propio sitio (bobbing / rotación local) ---
    // Registramos una lista de objetos a animar con parámetros por objeto.
    const animObjects = [];

    function addAnim(mesh, opts) {
      // Guarda posición base para mantener movimiento relativo
      animObjects.push({
        mesh: mesh,
        basePosition: mesh.position.clone(),
        bobAmp: opts.bobAmp || 0.15,
        bobSpeed: opts.bobSpeed || 1.5,
        rotSpeed: opts.rotSpeed || 0.6,
        phase: opts.phase || 0
      });
    }

    // Añadir las figuras creadas
    addAnim(box, { bobAmp: 0.2, bobSpeed: 1.2, rotSpeed: 0.4 });
    addAnim(sphere, { bobAmp: 0.18, bobSpeed: 1.6, rotSpeed: 0.6, phase: 0.5 });
    addAnim(cylinder, { bobAmp: 0.14, bobSpeed: 1.0, rotSpeed: 0.3, phase: 1.0 });
    addAnim(torus, { bobAmp: 0.22, bobSpeed: 1.4, rotSpeed: 0.7, phase: 1.3 });

    // Si el Yeti aún no está cargado, lo añadiremos desde el callback de import
    BABYLON.SceneLoader.ImportMesh(
      '',
      './assets/models/',
      'Yeti.gltf',
      scene,
      function (meshes) {
        if (meshes.length > 0) {
          const yeti = meshes[0];
          yeti.position = new BABYLON.Vector3(0, 0, 3);
          yeti.scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);
          // Ajuste: animar el yeti con menor bob y rotación lenta
          addAnim(yeti, { bobAmp: 0.08, bobSpeed: 0.9, rotSpeed: 0.25, phase: 0 });
        }
      },
      function (event) {
        if (event.lengthComputable) {
          console.log('Cargando Yeti: ' + (event.loaded * 100 / event.total).toFixed(0) + '%');
        }
      },
      function (scene, message, exception) {
        console.error('Error al cargar el modelo del Yeti:', message, exception);
      }
    );

    // Callback que aplica el movimiento relativo por objeto antes de cada frame
    scene.registerBeforeRender(function () {
      const t = performance.now() / 1000; // segundos
      const dt = scene.getEngine().getDeltaTime() / 1000; // delta en segundos
      for (let i = 0; i < animObjects.length; i++) {
        const a = animObjects[i];
        // Bob: desplazamiento Y relativo
        const offsetY = Math.sin(t * a.bobSpeed + a.phase) * a.bobAmp;
        a.mesh.position.y = a.basePosition.y + offsetY;
        // Rotación alrededor del eje Y local
        a.mesh.rotation.y += a.rotSpeed * dt;
      }
    });

    return scene;
  };

  const scene = createScene();

  engine.runRenderLoop(function () {
    scene.render();
  });

  window.addEventListener('resize', function () {
    engine.resize();
  });
});
