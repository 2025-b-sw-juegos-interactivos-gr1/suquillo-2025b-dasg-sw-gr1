// Obtener el canvas
const canvas = document.getElementById("renderCanvas");

// Crear el motor Babylon
const engine = new BABYLON.Engine(canvas, true);

// Variables globales del HUD
let pollenCollected = 0;
let totalPollen = 5; // Total de polen a recolectar
let score = 0;
let gameState = "playing"; // "playing", "victory"

// Función para actualizar el HUD
function updateHUD() {
  document.getElementById("pollenCount").textContent = pollenCollected;
  document.getElementById("totalPollen").textContent = totalPollen;
  document.getElementById("score").textContent = score;
  
  // Actualizar barra de progreso
  const progress = totalPollen > 0 ? (pollenCollected / totalPollen) * 100 : 0;
  const progressBar = document.getElementById("progressBar");
  progressBar.style.width = progress + "%";
  progressBar.textContent = Math.round(progress) + "%";
}

// Función para mostrar mensaje temporal - VERSIÓN CORREGIDA
function showMessage(text, duration = 2000) {
  const msgEl = document.getElementById("gameMessage");
  
  if (!msgEl) {
    console.error("❌ ERROR: No se encontró el elemento gameMessage");
    return;
  }
  
  console.log("📢 Mostrando mensaje:", text);
  
  // Limpiar cualquier timeout anterior
  if (msgEl.hideTimeout) {
    clearTimeout(msgEl.hideTimeout);
  }
  
  // Mostrar mensaje usando clase CSS
  msgEl.textContent = text;
  msgEl.classList.add("show");
  
  console.log("✅ Mensaje visible. Estado:", {
    hasShowClass: msgEl.classList.contains("show"),
    opacity: window.getComputedStyle(msgEl).opacity,
    visibility: window.getComputedStyle(msgEl).visibility
  });
  
  // Ocultar después del tiempo especificado
  msgEl.hideTimeout = setTimeout(() => {
    msgEl.classList.remove("show");
    console.log("⏰ Mensaje ocultado");
  }, duration);
}

// Función para mostrar pantalla de victoria
function showVictoryScreen() {
  const victoryScreen = document.getElementById("victoryScreen");
  const finalScoreEl = document.getElementById("finalScore");
  
  if (victoryScreen && finalScoreEl) {
    finalScoreEl.textContent = score;
    victoryScreen.classList.add("show");
    gameState = "victory";
  }
}

// Función para crear la escena
const createScene = () => {
  const scene = new BABYLON.Scene(engine);

  // === SUELO ===
  const GROUND_WIDTH = 200;
  const GROUND_HEIGHT = 400;
  
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: GROUND_WIDTH, height: GROUND_HEIGHT },
    scene
  );

  const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
  groundMaterial.diffuseTexture = new BABYLON.Texture("./assets/textures/grass.jpg", scene);
  groundMaterial.diffuseTexture.uScale = 10;
  groundMaterial.diffuseTexture.vScale = 20;
  ground.material = groundMaterial;
  ground.receiveShadows = true;
  ground.checkCollisions = false; // Desactivar colisión con suelo (la abeja vuela)

  // --- SKYBOX (adaptado al tamaño del suelo) ---
  const SKYBOX_WIDTH = GROUND_WIDTH * 1;
  const SKYBOX_DEPTH = GROUND_HEIGHT * 1;
  const SKYBOX_HEIGHT = 150;
  
  const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { 
    width: SKYBOX_WIDTH, 
    height: SKYBOX_HEIGHT, 
    depth: SKYBOX_DEPTH 
  }, scene);
  
  const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(
    "./assets/textures/skybox/",
    scene,
    ["px.jpg", "py.jpg", "pz.jpg", "nx.jpg", "ny.jpg", "nz.jpg"]
  );
  skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
  skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  skybox.material = skyboxMaterial;
  skybox.position.y = SKYBOX_HEIGHT / 2.2;

  // === CÁMARA SEGUIDORA ===
  const camera = new BABYLON.FollowCamera("FollowCamera", new BABYLON.Vector3(0, 10, -20), scene);
  camera.radius = 20;
  camera.heightOffset = 6;
  camera.rotationOffset = 180;
  camera.cameraAcceleration = 0.05;
  camera.maxCameraSpeed = 20;

  scene.registerBeforeRender(() => {
    if (playerBee) {
      camera.lockedTarget = playerBee;
    }
  });

  // === LUZ ===
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.8;

  // Variables de juego
  const pollenSpheres = [];
  const deliveryZones = [];
  let playerBee = null;
  let hasPollen = false;
  let currentPollen = null;

  const PICKUP_DISTANCE = 3;
  const DELIVERY_DISTANCE = 3.5;

  // --- CARGAR TREES ---
  BABYLON.SceneLoader.ImportMesh(
    "",
    "./assets/models/",
    "trees.glb",
    scene,
    (meshes) => {
      if (meshes.length > 0) {
        const rootMesh = meshes[0];
        rootMesh.position = new BABYLON.Vector3(0, 0, 0);
        rootMesh.scaling = new BABYLON.Vector3(4, 4, 4);
        meshes.forEach(m => {
          m.checkCollisions = true;
        });
        console.log("🌲 Árboles cargados");
      }
    }
  );

  // --- CARGAR ENVIRONMENT ---
  BABYLON.SceneLoader.ImportMesh(
    "",
    "./assets/models/",
    "environment.glb",
    scene,
    (meshes) => {
      if (meshes.length > 0) {
        const rootMesh = meshes[0];
        rootMesh.position = new BABYLON.Vector3(80, 0, -80);
        rootMesh.scaling = new BABYLON.Vector3(7, 7, 7);
        meshes.forEach(m => {
          m.checkCollisions = false;
        });
        console.log("🏞️ Entorno cargado");
      }
    }
  );

  // --- CARGAR ABEJAS NPC ---
  BABYLON.SceneLoader.ImportMesh(
    "",
    "./assets/models/",
    "flying_bee.glb",
    scene,
    (meshes) => {
      if (meshes.length === 0) return;
      const bee1 = meshes[0];

      try {
        if (bee1.rotationQuaternion) bee1.rotationQuaternion = null;
      } catch (e) { }

      bee1.scaling.set(2, 2, 2);
      bee1.position.set(75, 20, -120);

      const treesPosition = new BABYLON.Vector3(0, 0, 0);
      const directionToBee1 = treesPosition.subtract(bee1.position);
      bee1.rotation.y = Math.atan2(directionToBee1.x, directionToBee1.z);

      const clonesPos = [
        new BABYLON.Vector3(75, 15, -120),
        new BABYLON.Vector3(65, 15, -120),
        new BABYLON.Vector3(65, 20, -120),
        new BABYLON.Vector3(-65, 15, -100),
        new BABYLON.Vector3(-75, 15, -100),
        new BABYLON.Vector3(-80, 10, -100),
        new BABYLON.Vector3(-60, 10, -100),
        new BABYLON.Vector3(-50, 20, -100),
        new BABYLON.Vector3(-45, 15, -100),
        new BABYLON.Vector3(-37, 10, -100),
      ];

      clonesPos.forEach((pos, idx) => {
        const c = bee1.clone("bee_npc_" + idx, null);
        if (c) {
          c.position = pos.clone();
          const directionToTrees = treesPosition.subtract(c.position);
          c.rotation.y = Math.atan2(directionToTrees.x, directionToTrees.z);
        }
      });
      
      console.log("🐝 Abejas NPC cargadas");
    }
  );

  // --- CARGAR ABEJA JUGADOR ---
  BABYLON.SceneLoader.ImportMesh(
    "",
    "./assets/models/",
    "flying_bee.glb",
    scene,
    (meshes) => {
      if (meshes.length === 0) return;

      playerBee = meshes[0];
      if (playerBee.rotationQuaternion) playerBee.rotationQuaternion = null;

      playerBee.name = "playerBee";
      playerBee.scaling = new BABYLON.Vector3(1.8, 1.8, 1.8);
      playerBee.position = new BABYLON.Vector3(0, 7, -70);

      // ACTIVAR COLISIONES PARA EL JUGADOR
      playerBee.checkCollisions = true;
      playerBee.ellipsoid = new BABYLON.Vector3(1, 1, 1); // Reducido para mejor manejo
      playerBee.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);

      if (scene.skeletons.length > 0) {
        try {
          scene.beginAnimation(scene.skeletons[0], 0, 100, true);
        } catch (e) { }
      }

      playerBee.isPickable = false;
      
      console.log("✅ Abeja jugador cargada");
      showMessage("¡Bienvenid@! Recolecta polen de las flores doradas 🌼", 3000);
    }
  );

  // --- FUNCIÓN CREAR COLMENA COLGANTE ---
  function createHangingHive(scene, position, lookAtPosition) {
    const hiveContainer = new BABYLON.TransformNode("hiveContainer", scene);
    hiveContainer.position = position;

    const rope = BABYLON.MeshBuilder.CreateCylinder("rope", { height: 3, diameter: 0.2 }, scene);
    rope.position.y = 0.5;
    rope.parent = hiveContainer;
    rope.checkCollisions = true;
    const ropeMat = new BABYLON.StandardMaterial("ropeMat", scene);
    ropeMat.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1);
    rope.material = ropeMat;

    const hiveMat = new BABYLON.StandardMaterial("hiveMat", scene);
    hiveMat.diffuseTexture = new BABYLON.Texture("./assets/textures/colmena.jpg", scene);
    hiveMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.1);
    hiveMat.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.05);

    const hiveBody = BABYLON.MeshBuilder.CreateCylinder("hiveBody", {
      height: 10, diameterTop: 4, diameterBottom: 6, tessellation: 32
    }, scene);
    hiveBody.position.y = -3;
    hiveBody.parent = hiveContainer;
    hiveBody.material = hiveMat;
    hiveBody.checkCollisions = true;

    const hiveTop = BABYLON.MeshBuilder.CreateSphere("hiveTop", { diameter: 5, segments: 16, slice: 0.5 }, scene);
    hiveTop.position.y = 2;
    hiveTop.scaling.y = 0.6;
    hiveTop.parent = hiveContainer;
    hiveTop.material = hiveMat;
    hiveTop.checkCollisions = true;

    const hiveBottom = BABYLON.MeshBuilder.CreateSphere("hiveBottom", { diameter: 6, segments: 16, slice: 0.5 }, scene);
    hiveBottom.position.y = -8;
    hiveBottom.rotation.x = Math.PI;
    hiveBottom.scaling.y = 0.8;
    hiveBottom.parent = hiveContainer;
    hiveBottom.material = hiveMat;
    hiveBottom.checkCollisions = true;

    const direction = lookAtPosition.subtract(position);
    const angleToTrees = Math.atan2(direction.x, direction.z);
    hiveContainer.rotation.y = angleToTrees;

    const entranceOuter = BABYLON.MeshBuilder.CreateTorus("entranceOuter", { diameter: 2.5, thickness: 0.3, tessellation: 32 }, scene);
    entranceOuter.position = new BABYLON.Vector3(0, -2, 3.2);
    entranceOuter.rotation.y = Math.PI / 2;
    entranceOuter.parent = hiveContainer;
    const entranceOuterMat = new BABYLON.StandardMaterial("entranceOuterMat", scene);
    entranceOuterMat.diffuseColor = new BABYLON.Color3(0.7, 0.55, 0.2);
    entranceOuter.material = entranceOuterMat;

    const entranceTunnel = BABYLON.MeshBuilder.CreateCylinder("entranceTunnel", { height: 2, diameter: 2.5 }, scene);
    entranceTunnel.position = new BABYLON.Vector3(0, -2, 2.5);
    entranceTunnel.rotation.x = Math.PI / 2;
    entranceTunnel.parent = hiveContainer;
    const tunnelMat = new BABYLON.StandardMaterial("tunnelMat", scene);
    tunnelMat.diffuseColor = new BABYLON.Color3(0.1, 0.05, 0);
    tunnelMat.emissiveColor = new BABYLON.Color3(0.05, 0.02, 0);
    entranceTunnel.material = tunnelMat;
    entranceTunnel.checkCollisions = false;
    entranceTunnel.isPickable = false;

    deliveryZones.push(entranceTunnel);

    const entranceHole = BABYLON.MeshBuilder.CreateCylinder("entranceHole", { height: 0.5, diameter: 1.8 }, scene);
    entranceHole.position = new BABYLON.Vector3(0, -2, 3.5);
    entranceHole.rotation.x = Math.PI / 2;
    entranceHole.parent = hiveContainer;
    const holeMat = new BABYLON.StandardMaterial("holeMat", scene);
    holeMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    holeMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
    entranceHole.material = holeMat;

    for (let i = 0; i < 5; i++) {
      const layer = BABYLON.MeshBuilder.CreateTorus("layer" + i, { diameter: 6 + i * 0.3, thickness: 0.15, tessellation: 32 }, scene);
      layer.position.y = -1 - i * 1.5;
      layer.parent = hiveContainer;
      const layerMat = new BABYLON.StandardMaterial("layerMat" + i, scene);
      layerMat.diffuseColor = new BABYLON.Color3(0.7, 0.55, 0.2);
      layer.material = layerMat;
    }

    let angle = 0;
    scene.registerBeforeRender(() => {
      angle += 0.01;
      hiveContainer.rotation.z = Math.sin(angle) * 0.05;
    });

    return hiveContainer;
  }

  const hangingHive = createHangingHive(
    scene,
    new BABYLON.Vector3(70, 20, -120),
    new BABYLON.Vector3(0, 0, 0)
  );

  // --- FUNCIÓN CREAR COLMENA DE SUELO ---
  function createGroundHive(scene, position, lookAtPosition) {
    const hiveContainer = new BABYLON.TransformNode("groundHiveContainer", scene);
    hiveContainer.position = position;

    const direction = lookAtPosition.subtract(position);
    const angleToTrees = Math.atan2(direction.x, direction.z);
    hiveContainer.rotation.y = angleToTrees;

    const woodMat = new BABYLON.StandardMaterial("woodMat", scene);
    woodMat.diffuseTexture = new BABYLON.Texture("./assets/textures/colmena.jpg", scene);
    woodMat.specularColor = new BABYLON.Color3(0.2, 0.15, 0.1);

    const roofMat = new BABYLON.StandardMaterial("roofMat", scene);
    roofMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    roofMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

    const base = BABYLON.MeshBuilder.CreateBox("base", { width: 12, height: 0.8, depth: 8 }, scene);
    base.position.y = 0.4;
    base.parent = hiveContainer;
    base.material = woodMat;
    base.checkCollisions = true;

    const boxHeight = 3;
    const boxCount = 4;

    for (let i = 0; i < boxCount; i++) {
      const box = BABYLON.MeshBuilder.CreateBox("hiveBox" + i + "_" + position.x + "_" + position.z, { width: 10, height: boxHeight, depth: 7 }, scene);
      box.position.y = 0.8 + boxHeight * i + boxHeight / 2;
      box.parent = hiveContainer;
      box.material = woodMat;
      box.checkCollisions = true;

      const stripe = BABYLON.MeshBuilder.CreateBox("stripe" + i + "_" + position.x + "_" + position.z, { width: 10.2, height: 0.15, depth: 7.2 }, scene);
      stripe.position.y = 0.8 + boxHeight * (i + 1);
      stripe.parent = hiveContainer;
      const stripeMat = new BABYLON.StandardMaterial("stripeMat" + i, scene);
      stripeMat.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.15);
      stripe.material = stripeMat;
    }

    const roof = BABYLON.MeshBuilder.CreateBox("roof", { width: 12, height: 0.5, depth: 8 }, scene);
    roof.position.y = 0.8 + boxHeight * boxCount + 0.6;
    roof.parent = hiveContainer;
    roof.material = roofMat;
    roof.checkCollisions = true;

    const roofTop = BABYLON.MeshBuilder.CreateBox("roofTop", { width: 13, height: 0.3, depth: 9 }, scene);
    roofTop.position.y = 0.8 + boxHeight * boxCount + 1.2;
    roofTop.parent = hiveContainer;
    roofTop.material = roofMat;
    roofTop.checkCollisions = true;

    const entrance = BABYLON.MeshBuilder.CreateBox("entrance", { width: 6, height: 0.6, depth: 0.5 }, scene);
    entrance.position = new BABYLON.Vector3(0, 1.2, 3.75);
    entrance.parent = hiveContainer;
    const entranceMat = new BABYLON.StandardMaterial("entranceMat", scene);
    entranceMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    entranceMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    entrance.material = entranceMat;
    entrance.checkCollisions = false;

    const landingBoard = BABYLON.MeshBuilder.CreateBox("landingBoard", { width: 8, height: 0.3, depth: 3.5 }, scene);
    landingBoard.position = new BABYLON.Vector3(0, 1, 5.5);
    landingBoard.rotation.x = -Math.PI / 12;
    landingBoard.parent = hiveContainer;
    landingBoard.material = woodMat;
    landingBoard.checkCollisions = true;

    const pollenShelf1 = BABYLON.MeshBuilder.CreateBox("pollenShelf1_" + position.x + "_" + position.z, { width: 1.5, height: 0.25, depth: 1.8 }, scene);
    pollenShelf1.position = new BABYLON.Vector3(-3.8, 1.4, 4.2);
    pollenShelf1.parent = hiveContainer;
    const pollenShelfMat = new BABYLON.StandardMaterial("pollenShelfMat", scene);
    pollenShelfMat.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.3);
    pollenShelfMat.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.05);
    pollenShelf1.material = pollenShelfMat;
    pollenShelf1.checkCollisions = false;
    pollenShelf1.isPickable = false;

    const pollenShelf2 = BABYLON.MeshBuilder.CreateBox("pollenShelf2_" + position.x + "_" + position.z, { width: 1.5, height: 0.25, depth: 1.8 }, scene);
    pollenShelf2.position = new BABYLON.Vector3(3.8, 1.4, 4.2);
    pollenShelf2.parent = hiveContainer;
    pollenShelf2.material = pollenShelfMat;
    pollenShelf2.checkCollisions = false;
    pollenShelf2.isPickable = false;

    deliveryZones.push(pollenShelf1);
    deliveryZones.push(pollenShelf2);

    for (let i = 1; i <= 4; i++) {
      const handle = BABYLON.MeshBuilder.CreateTorus("handle" + i + "_" + position.x + "_" + position.z, { diameter: 0.7, thickness: 0.12, tessellation: 16 }, scene);
      handle.position = new BABYLON.Vector3(-5.3, 0.8 + boxHeight * i - 1, 0);
      handle.rotation.z = Math.PI / 2;
      handle.parent = hiveContainer;
      const handleMat = new BABYLON.StandardMaterial("handleMat" + i, scene);
      handleMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
      handleMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
      handle.material = handleMat;
    }

    return hiveContainer;
  }

  const groundHive = createGroundHive(
    scene,
    new BABYLON.Vector3(-45, 0, -100),
    new BABYLON.Vector3(0, 0, 0)
  );

  const groundHive2 = createGroundHive(
    scene,
    new BABYLON.Vector3(-70, 0, -100),
    new BABYLON.Vector3(0, 0, 0)
  );

  createGlowCircle(scene, groundHive.position, 9);
  createGlowCircle(scene, groundHive2.position, 9);
  createGlowCircle(scene, new BABYLON.Vector3(70, 0, -120), 9);

  function createGlowCircle(scene, position, radius = 20) {
    const circle = BABYLON.MeshBuilder.CreateDisc("glowCircle", { radius: radius, tessellation: 200 }, scene);
    circle.rotation.x = Math.PI / 2;
    circle.position = position.add(new BABYLON.Vector3(0, 0.05, 0));
    const mat = new BABYLON.StandardMaterial("glowCircleMat", scene);
    mat.diffuseColor = new BABYLON.Color3(0, 1, 0);
    mat.emissiveColor = new BABYLON.Color3(0, 1, 0);
    mat.alpha = 0.6;
    circle.material = mat;
    return circle;
  }

  // --- CARGAR FLORES Y POLEN ---
  const flowerPositions = [
    new BABYLON.Vector3(-90, 0, 90),
    new BABYLON.Vector3(-90, 0, 30),
    new BABYLON.Vector3(-90, 0, -30),
    new BABYLON.Vector3(-90, 0, -90),
    new BABYLON.Vector3(-55, 0, 90),
    new BABYLON.Vector3(-55, 0, 30),
    new BABYLON.Vector3(-55, 0, -30),
    new BABYLON.Vector3(-55, 0, -90),
    new BABYLON.Vector3(-10, 0, 90),
    new BABYLON.Vector3(-10, 0, 30),
    new BABYLON.Vector3(-10, 0, -30),
    new BABYLON.Vector3(-10, 0, -90),
    new BABYLON.Vector3(35, 0, 90),
    new BABYLON.Vector3(35, 0, 30),
    new BABYLON.Vector3(35, 0, -30),
    new BABYLON.Vector3(35, 0, -90),
    new BABYLON.Vector3(70, 0, 90),
    new BABYLON.Vector3(70, 0, 30),
    new BABYLON.Vector3(70, 0, -30),
    new BABYLON.Vector3(70, 0, -90)
  ];

  // Posiciones fijas para el polen (5 posiciones específicas)
  const pollenPositions = [
    new BABYLON.Vector3(-85, 7.5, 95),
    new BABYLON.Vector3(-50, 7.5, 37),
    new BABYLON.Vector3(-1, 7.5, -20),
    new BABYLON.Vector3(45, 7.5, -15),
    new BABYLON.Vector3(75, 7.5, 95)
  ];

  // Crear polen en posiciones fijas (5 polen por grupo)
  pollenPositions.forEach((position, groupIndex) => {
    const pollenCount = 5;
    const spacing = 3;

    for (let i = 0; i < pollenCount; i++) {
      const pollen = BABYLON.MeshBuilder.CreateSphere(`pollen_${groupIndex}_${i}`, { diameter: 1 }, scene);

      const pMat = new BABYLON.StandardMaterial(`pollenMat_${groupIndex}_${i}`, scene);
      pMat.diffuseColor = new BABYLON.Color3(1.0, 0.92, 0.0);
      pMat.emissiveColor = new BABYLON.Color3(1.0, 0.9, 0.0);
      pMat.specularColor = new BABYLON.Color3(1, 1, 0.6);
      pollen.material = pMat;

      pollen.position = new BABYLON.Vector3(
        position.x + (i - Math.floor(pollenCount / 2)) * spacing,
        position.y,
        position.z
      );
      
      pollen.isPickable = true;
      pollen.checkCollisions = false;

      // Animación de rotación
      scene.registerBeforeRender(() => {
        if (pollen && !pollen.isDisposed()) {
          pollen.rotation.y += 0.02;
        }
      });

      // Sistema de partículas brillantes
      const particleSystem = new BABYLON.ParticleSystem(`pollenParticles_${groupIndex}_${i}`, 100, scene);
      particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
      
      particleSystem.emitter = pollen;
      particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
      particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);

      particleSystem.color1 = new BABYLON.Color4(1, 0.95, 0.3, 1);
      particleSystem.color2 = new BABYLON.Color4(1, 0.85, 0.1, 1);
      particleSystem.colorDead = new BABYLON.Color4(1, 0.9, 0.2, 0);

      particleSystem.minSize = 0.1;
      particleSystem.maxSize = 0.3;

      particleSystem.minLifeTime = 0.5;
      particleSystem.maxLifeTime = 1.5;

      particleSystem.emitRate = 20;

      particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;

      particleSystem.gravity = new BABYLON.Vector3(0, 0.5, 0);

      particleSystem.direction1 = new BABYLON.Vector3(-0.3, -0.3, -0.3);
      particleSystem.direction2 = new BABYLON.Vector3(0.3, 0.3, 0.3);

      particleSystem.minEmitPower = 0.2;
      particleSystem.maxEmitPower = 0.5;

      particleSystem.updateSpeed = 0.01;

      particleSystem.start();

      pollenSpheres.push(pollen);
    }
  });

  // Cargar flores (sin polen)
  flowerPositions.forEach((position, flowerIndex) => {
    BABYLON.SceneLoader.ImportMesh(
      "",
      "./assets/models/",
      "flowers.glb",
      scene,
      (meshes) => {
        if (meshes.length > 0) {
          const rootMesh = meshes[0];
          rootMesh.position = position.clone();
          rootMesh.scaling = new BABYLON.Vector3(5, 5, 5);
          
          meshes.forEach(m => {
            m.checkCollisions = true;
          });
        }
      }
    );
  });

  // Actualizar HUD inicial
  updateHUD();

  // --- CONTROL DEL JUGADOR ---
  const inputMap = {};
  scene.actionManager = scene.actionManager || new BABYLON.ActionManager(scene);

  scene.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
      inputMap[evt.sourceEvent.key.toLowerCase()] = true;
    })
  );

  scene.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, (evt) => {
      inputMap[evt.sourceEvent.key.toLowerCase()] = false;
    })
  );

  const PLAYER_SPEED = 0.4;

  scene.onBeforeRenderObservable.add(() => {
    if (!playerBee || gameState !== "playing") return;

    const rotY = playerBee.rotation ? playerBee.rotation.y : 0;
    const forwardDir = new BABYLON.Vector3(Math.sin(rotY), 0, Math.cos(rotY));

    let movement = BABYLON.Vector3.Zero();
    let isMoving = false;

    // Movimiento horizontal
    if (inputMap["w"] || inputMap["arrowup"]) {
      movement.addInPlace(forwardDir);
      isMoving = true;
    }
    if (inputMap["s"] || inputMap["arrowdown"]) {
      movement.subtractInPlace(forwardDir);
      isMoving = true;
    }
    
    // Rotación
    if (inputMap["a"] || inputMap["arrowleft"]) {
      playerBee.rotation.y -= 0.06 * scene.getAnimationRatio();
    }
    if (inputMap["d"] || inputMap["arrowright"]) {
      playerBee.rotation.y += 0.06 * scene.getAnimationRatio();
    }

    // Movimiento vertical
    const verticalSpeed = 1;
    if (inputMap["q"]) {
      movement.y += verticalSpeed;
      isMoving = true;
    } else if (inputMap["e"]) {
      movement.y -= verticalSpeed;
      isMoving = true;
    }

    // Normalizar y aplicar movimiento
    if (isMoving && movement.length() > 0) {
      movement.normalize();
      playerBee.moveWithCollisions(movement.scale(PLAYER_SPEED * scene.getAnimationRatio()));
    }

    // Inclinación visual
    const targetTilt = inputMap["w"] ? -0.12 : (inputMap["s"] ? 0.15 : 0);
    playerBee.rotation.x += (targetTilt - playerBee.rotation.x) * 0.1;

    // Límites del mapa
    const maxX = GROUND_WIDTH / 2 - 5;
    const maxZ = GROUND_HEIGHT / 2 - 5;
    playerBee.position.x = Math.max(-maxX, Math.min(maxX, playerBee.position.x));
    playerBee.position.z = Math.max(-maxZ, Math.min(maxZ, playerBee.position.z));
    playerBee.position.y = Math.max(1.5, Math.min(60, playerBee.position.y));
  });

  // --- RECOGER Y ENTREGAR POLEN ---
  window.addEventListener("keydown", (evt) => {
    const key = evt.key.toLowerCase();
    if (key === " ") {
      evt.preventDefault();
      if (gameState !== "playing") return;
      
      // NUEVA LÓGICA: Detectar qué está cerca (polen o colmena) y actuar en consecuencia
      const nearPollen = checkNearPollen();
      const nearDeliveryZone = checkNearDeliveryZone();
      
      // Si está cerca de una zona de entrega
      if (nearDeliveryZone) {
        attemptDelivery();
      }
      // Si está cerca de polen
      else if (nearPollen) {
        attemptPickup();
      }
      // Si no está cerca de nada
      else {
        console.log("⚠️ No hay polen ni colmena cerca");
        showMessage("Busca las esferas doradas de polen 🌼 o las colmenas verdes 🏠", 2500);
      }
    }
  });

  // Función auxiliar para verificar si hay polen cerca
  function checkNearPollen() {
    if (!playerBee) return false;
    
    for (let i = 0; i < pollenSpheres.length; i++) {
      const p = pollenSpheres[i];
      if (!p || p.isDisposed()) continue;
      
      const dist = BABYLON.Vector3.Distance(playerBee.position, p.getAbsolutePosition());
      if (dist <= PICKUP_DISTANCE) {
        return true;
      }
    }
    return false;
  }

  // Función auxiliar para verificar si hay zona de entrega cerca
  function checkNearDeliveryZone() {
    if (!playerBee) return false;
    
    for (let zone of deliveryZones) {
      if (!zone) continue;
      
      const zonePos = zone.getAbsolutePosition ? zone.getAbsolutePosition() : zone.position;
      const dist = BABYLON.Vector3.Distance(playerBee.position, zonePos);
      
      if (dist <= DELIVERY_DISTANCE) {
        return true;
      }
    }
    return false;
  }

  function attemptPickup() {
    if (!playerBee) return;
    
    // VERIFICACIÓN: Si ya tiene polen, mostrar mensaje y salir
    if (hasPollen) {
      console.log("⚠️ Intentando recoger polen pero ya tiene uno");
      showMessage("¡Ya tienes un polen! No puedes recoger otro hasta entregarlo 🐝", 3000);
      return;
    }

    // Buscar polen cercano
    for (let i = 0; i < pollenSpheres.length; i++) {
      const p = pollenSpheres[i];
      if (!p || p.isDisposed()) continue;

      const dist = BABYLON.Vector3.Distance(playerBee.position, p.getAbsolutePosition());
      
      if (dist <= PICKUP_DISTANCE) {
        console.log("✅ Polen encontrado a distancia:", dist);
        
        hasPollen = true;
        currentPollen = p;

        p.isPickable = false;
        p.setParent(playerBee);
        p.position = new BABYLON.Vector3(0, 0.6, 1);
        p.scaling = new BABYLON.Vector3(0.7, 0.7, 0.7);

        showMessage("¡Polen recolectado! 🌼", 2000);
        return;
      }
    }
    
    // Si llega aquí, no hay polen cerca (no debería pasar con la nueva lógica)
    console.log("⚠️ No hay polen cerca. Distancia mínima:", PICKUP_DISTANCE);
  }

  function attemptDelivery() {
    if (!playerBee) return;
    
    // VERIFICACIÓN: Si no tiene polen, mostrar mensaje y salir
    if (!hasPollen || !currentPollen) {
      console.log("⚠️ Intentando entregar polen pero no tiene ninguno");
      showMessage("¡No tienes polen para entregar! Busca las flores doradas 🌼", 3000);
      return;
    }

    // Buscar zona de entrega cercana
    for (let zone of deliveryZones) {
      if (!zone) continue;
      
      const zonePos = zone.getAbsolutePosition ? zone.getAbsolutePosition() : zone.position;
      const dist = BABYLON.Vector3.Distance(playerBee.position, zonePos);
      
      if (dist <= DELIVERY_DISTANCE) {
        console.log("✅ Zona de entrega encontrada a distancia:", dist);
        
        // Entregar polen
        currentPollen.setParent(null);
        currentPollen.position = zonePos.add(new BABYLON.Vector3(0, 0.4, 0));

        const idx = pollenSpheres.indexOf(currentPollen);
        if (idx !== -1) pollenSpheres.splice(idx, 1);

        // Actualizar estadísticas
        pollenCollected++;
        score += 10;
        updateHUD();

        // Efecto de partículas
        createDeliveryParticles(scene, zonePos);

        showMessage("¡Polen entregado! +10 puntos 🍯", 1500);

        // Resetear estado
        hasPollen = false;
        currentPollen = null;

        // Verificar victoria
        if (pollenCollected === totalPollen) {
          setTimeout(() => {
            showMessage("🎉 ¡MISIÓN COMPLETADA! 🎉", 3000);
            setTimeout(() => {
              showVictoryScreen();
            }, 3500);
          }, 1000);
        }

        return;
      }
    }
    
    // Si llega aquí, no hay zona de entrega cerca (no debería pasar con la nueva lógica)
    console.log("⚠️ No hay zona de entrega cerca. Distancia mínima:", DELIVERY_DISTANCE);
    showMessage("¡Acércate más a la colmena! 🏠", 2000);
  }

  // --- SISTEMA DE PARTÍCULAS PARA ENTREGA ---
  function createDeliveryParticles(scene, position) {
    const particleSystem = new BABYLON.ParticleSystem("particles", 50, scene);
    particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);

    particleSystem.emitter = position;
    particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
    particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, 0, 0.5);

    particleSystem.color1 = new BABYLON.Color4(1, 0.9, 0, 1);
    particleSystem.color2 = new BABYLON.Color4(1, 0.8, 0.2, 1);
    particleSystem.colorDead = new BABYLON.Color4(0.8, 0.6, 0, 0);

    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.3;

    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 0.8;

    particleSystem.emitRate = 100;

    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;

    particleSystem.gravity = new BABYLON.Vector3(0, -2, 0);

    particleSystem.direction1 = new BABYLON.Vector3(-1, 2, -1);
    particleSystem.direction2 = new BABYLON.Vector3(1, 4, 1);

    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 3;

    particleSystem.updateSpeed = 0.01;

    particleSystem.start();

    setTimeout(() => {
      particleSystem.stop();
      setTimeout(() => particleSystem.dispose(), 1000);
    }, 500);
  }

  return scene;
};

// Crear la escena
const scene = createScene();

// Renderizar la escena en loop
engine.runRenderLoop(() => {
  scene.render();
});

// Redimensionar el canvas cuando cambie el tamaño de la ventana
window.addEventListener("resize", () => {
  engine.resize();
});