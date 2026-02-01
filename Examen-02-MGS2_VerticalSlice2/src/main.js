/**
 * MAIN.JS - Vertical Slice MGS2
 * 
 * Este es el archivo principal que integra:
 * - Épica 01: Control y movilidad táctica
 * - Épica 02: Sistema de stealth y estados
 * - Épica 03: IA enemiga coordinada
 * - Épica 05: Iluminación y sombras
 * 
 * OBJETIVO DEL VERTICAL SLICE:
 * Demostrar infiltración táctica en una sala de guardia
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = null;
        this.camera = null;
        this.player = null;
        this.enemies = [];
        this.stealthSystem = null;
        
        // Estado del juego
        this.gameState = 'PLAYING'; // PLAYING, WIN, LOSE
        this.goalPosition = new BABYLON.Vector3(0, 0, 20);
        
        // Radar
        this.radarCanvas = document.getElementById('radarCanvas');
        this.radarCtx = this.radarCanvas.getContext('2d');
        
        this.init();
    }

    /**
     * Inicializa el juego
     */
    init() {
        this.createScene();
        this.createLevel();
        this.setupLighting();
        this.createPlayer();
        this.createEnemies();
        this.initStealthSystem();
        
        // Loop del juego
        this.engine.runRenderLoop(() => {
            if (this.gameState === 'PLAYING') {
                this.update();
            }
            this.scene.render();
        });
        
        // Responsive
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }

    /**
     * Crea la escena base
     */
    createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.15);
        
        // Habilitar sistema de colisiones
        this.scene.collisionsEnabled = true;
        
        // Definir gravedad (opcional, para movimiento más realista)
        this.scene.gravity = new BABYLON.Vector3(0, -0.1, 0);
        
        // Cámara tercera persona cercana al personaje
        this.camera = new BABYLON.ArcRotateCamera(
            "camera",
            -Math.PI / 2,  // Ángulo horizontal (detrás del personaje)
            Math.PI / 4,   // Ángulo vertical (ligeramente arriba)
            5,             // Distancia cercana al personaje
            new BABYLON.Vector3(0, 1, 0),  // Apuntar a altura del torso
            this.scene
        );
        
        this.camera.lowerRadiusLimit = 3;   // Mínimo muy cerca
        this.camera.upperRadiusLimit = 8;   // Máximo no tan lejos
        this.camera.lowerBetaLimit = 0.3;   // No mirar desde muy abajo
        this.camera.upperBetaLimit = Math.PI / 2.5;  // No mirar desde muy arriba
        this.camera.wheelPrecision = 50;    // Sensibilidad del zoom
    }

    /**
     * Crea el nivel de demostración
     * Una sala rectangular con obstáculos
     */
    createLevel() {
        // Suelo con textura
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 30,
            height: 40
        }, this.scene);
        
        const groundMat = new BABYLON.StandardMaterial("groundMat", this.scene);
        groundMat.diffuseTexture = new BABYLON.Texture("assets/textures/suelo.jpg", this.scene);
        groundMat.diffuseTexture.uScale = 6; // Repetir textura
        groundMat.diffuseTexture.vScale = 8;
        // Configuración metálica
        groundMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.7); // Brillo metálico azulado
        groundMat.specularPower = 64; // Reflejo concentrado
        ground.material = groundMat;
        ground.checkCollisions = true;
        
        // Paredes
        this.createWalls();
        
        // Obstáculos (cajas para ocultarse)
        this.createObstacles();
        
        // Zonas de sombra (Épica 05)
        this.createShadowZones();
        
        // Objetivo visual (puerta de salida)
        this.createGoal();
    }

    /**
     * Crea las paredes de la sala con textura
     */
    createWalls() {
        const wallMat = new BABYLON.StandardMaterial("wallMat", this.scene);
        wallMat.diffuseTexture = new BABYLON.Texture("assets/textures/pared.jpg", this.scene);
        wallMat.diffuseTexture.uScale = 4; // Repetir textura horizontalmente
        wallMat.diffuseTexture.vScale = 2; // Repetir textura verticalmente
        // Configuración metálica
        wallMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.6); // Brillo metálico
        wallMat.specularPower = 48; // Reflejo concentrado
        
        // Paredes más altas (8 unidades de altura)
        const wallPositions = [
            { pos: new BABYLON.Vector3(0, 4, -20), size: new BABYLON.Vector3(30, 8, 0.5) },  // Norte
            { pos: new BABYLON.Vector3(0, 4, 20), size: new BABYLON.Vector3(30, 8, 0.5) },   // Sur
            { pos: new BABYLON.Vector3(-15, 4, 0), size: new BABYLON.Vector3(0.5, 8, 40) },  // Oeste
            { pos: new BABYLON.Vector3(15, 4, 0), size: new BABYLON.Vector3(0.5, 8, 40) }    // Este
        ];
        
        wallPositions.forEach((data, i) => {
            const wall = BABYLON.MeshBuilder.CreateBox(`wall_${i}`, {
                width: data.size.x,
                height: data.size.y,
                depth: data.size.z
            }, this.scene);
            
            wall.position = data.pos;
            wall.material = wallMat;
            wall.checkCollisions = true;
        });
    }

    /**
     * Crea obstáculos en el nivel con textura
     */
    createObstacles() {
        const boxMat = new BABYLON.StandardMaterial("boxMat", this.scene);
        boxMat.diffuseTexture = new BABYLON.Texture("assets/textures/cajas.jpg", this.scene);
        // Configuración metálica
        boxMat.specularColor = new BABYLON.Color3(0.7, 0.7, 0.8); // Brillo metálico fuerte
        boxMat.specularPower = 80; // Reflejo muy concentrado (más metálico)
        
        const obstacles = [
            { pos: new BABYLON.Vector3(-5, 1, 5), size: new BABYLON.Vector3(2, 2, 2) },
            { pos: new BABYLON.Vector3(5, 1, 5), size: new BABYLON.Vector3(2, 2, 2) },
            { pos: new BABYLON.Vector3(-5, 1, 12), size: new BABYLON.Vector3(2, 2, 2) },
            { pos: new BABYLON.Vector3(5, 1, 12), size: new BABYLON.Vector3(2, 2, 2) },
            { pos: new BABYLON.Vector3(0, 1, 8), size: new BABYLON.Vector3(3, 2, 3) }
        ];
        
        obstacles.forEach((data, i) => {
            const box = BABYLON.MeshBuilder.CreateBox(`obstacle_${i}`, {
                width: data.size.x,
                height: data.size.y,
                depth: data.size.z
            }, this.scene);
            
            box.position = data.pos;
            box.material = boxMat;
            box.checkCollisions = true;
        });
    }

    /**
     * Crea zonas de sombra visual (Épica 05)
     */
    createShadowZones() {
        const shadowMat = new BABYLON.StandardMaterial("shadowMat", this.scene);
        shadowMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.2);
        shadowMat.alpha = 0.3;
        
        const shadowZones = [
            { pos: new BABYLON.Vector3(-8, 0.1, 5), radius: 3 },
            { pos: new BABYLON.Vector3(8, 0.1, 5), radius: 3 },
            { pos: new BABYLON.Vector3(-8, 0.1, 12), radius: 3 },
            { pos: new BABYLON.Vector3(8, 0.1, 12), radius: 3 }
        ];
        
        shadowZones.forEach((data, i) => {
            const shadow = BABYLON.MeshBuilder.CreateDisc(`shadow_${i}`, {
                radius: data.radius
            }, this.scene);
            
            shadow.position = data.pos;
            shadow.rotation.x = Math.PI / 2;
            shadow.material = shadowMat;
            
            // Registrar en el sistema de stealth
            if (this.stealthSystem) {
                this.stealthSystem.addShadowArea(data.pos, data.radius);
            }
        });
    }

    /**
     * Crea el objetivo (puerta de salida)
     */
    createGoal() {
        const goalMat = new BABYLON.StandardMaterial("goalMat", this.scene);
        goalMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        goalMat.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
        
        const goal = BABYLON.MeshBuilder.CreateBox("goal", {
            width: 3,
            height: 3,
            depth: 0.5
        }, this.scene);
        
        goal.position = this.goalPosition.clone();
        goal.material = goalMat;
        
        // Animación de pulso
        let t = 0;
        this.scene.registerBeforeRender(() => {
            t += 0.02;
            goalMat.emissiveColor.g = 0.3 + Math.sin(t) * 0.2;
        });
    }

    /**
     * Configura la iluminación (Épica 05)
     * Ambiente muy oscuro para gameplay de sigilo
     */
    setupLighting() {
        // Luz ambiental muy baja para ambiente oscuro
        const ambient = new BABYLON.HemisphericLight(
            "ambient",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambient.intensity = 0.15;
        ambient.groundColor = new BABYLON.Color3(0.05, 0.05, 0.08);
        
        // Luz direccional muy suave
        const directional = new BABYLON.DirectionalLight(
            "directional",
            new BABYLON.Vector3(-0.5, -1, 0.5),
            this.scene
        );
        directional.intensity = 0.1;
        
        // Luces puntuales limitadas (máximo 4 para evitar errores de shader)
        const lightPositions = [
            new BABYLON.Vector3(0, 5, -5),
            new BABYLON.Vector3(0, 5, 10),
            new BABYLON.Vector3(-8, 5, 5),
            new BABYLON.Vector3(8, 5, 5)
        ];
        
        lightPositions.forEach((pos, i) => {
            const light = new BABYLON.PointLight(`light_${i}`, pos, this.scene);
            light.intensity = 0.5;
            light.range = 10;
            
            // Luz invisible (sin representación visual)
        });
    }

    /**
     * Crea el jugador
     */
    createPlayer() {
        this.player = new PlayerController(this.scene, this.camera);
        this.player.reset(new BABYLON.Vector3(0, 1, -15));
    }

    /**
     * Crea los enemigos con rutas de patrullaje usando EnemyFactory
     * 
     * Tipos disponibles:
     * - NINJA: Visión corta (8) y ancha (90°), rápido, detecta en 3s
     * - GUARD: Visión media (15) y media (60°), lento, detecta en 5s
     * - SNIPER: Visión larga (25) y estrecha (30°), estático, detecta en 2s
     */
    createEnemies() {
        // Enemigo 1: NINJA (Gray Fox) - Patrulla horizontal
        // Visión corta pero ancha, muy rápido
        const patrol1 = [
            new BABYLON.Vector3(-10, 1, 5),
            new BABYLON.Vector3(10, 1, 5),
            new BABYLON.Vector3(10, 1, 12),
            new BABYLON.Vector3(-10, 1, 12)
        ];
        
        const enemy1 = EnemyFactory.createNinja(
            this.scene,
            patrol1[0],
            patrol1,
            1
        );
        this.enemies.push(enemy1);
        
        // Enemigo 2: GUARD (Guardia estándar) - Patrulla vertical
        // Visión media y equilibrada
        const patrol2 = [
            new BABYLON.Vector3(0, 1, 0),
            new BABYLON.Vector3(0, 1, 15)
        ];
        
        const enemy2 = EnemyFactory.createGuard(
            this.scene,
            patrol2[0],
            patrol2,
            2
        );
        this.enemies.push(enemy2);
        
        console.log('Enemigos creados con EnemyFactory:');
        console.log('- Enemigo 1: NINJA (Gray Fox) - Visión: 8m, Ángulo: 90°, Detección: 3s');
        console.log('- Enemigo 2: GUARD - Visión: 15m, Ángulo: 60°, Detección: 5s');
    }

    /**
     * Inicializa el sistema de stealth
     */
    initStealthSystem() {
        this.stealthSystem = new StealthSystem(this.scene);
        
        // Registrar zonas de sombra
        const shadowZones = [
            { pos: new BABYLON.Vector3(-8, 0.1, 5), radius: 3 },
            { pos: new BABYLON.Vector3(8, 0.1, 5), radius: 3 },
            { pos: new BABYLON.Vector3(-8, 0.1, 12), radius: 3 },
            { pos: new BABYLON.Vector3(8, 0.1, 12), radius: 3 }
        ];
        
        shadowZones.forEach(zone => {
            this.stealthSystem.addShadowArea(zone.pos, zone.radius);
        });
    }

    /**
     * Update principal del juego
     */
    update() {
        const deltaTime = this.engine.getDeltaTime() / 1000;
        
        // Actualizar jugador
        this.player.update();
        
        // Cámara sigue al jugador (tercera persona)
        this.camera.target = this.player.position.add(new BABYLON.Vector3(0, 1, 0));
        
        // Actualizar enemigos
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime, this.player);
        });
        
        // Actualizar sistema de stealth
        this.stealthSystem.update(deltaTime, this.player, this.enemies);
        
        // Actualizar radar
        this.updateRadar();
        
        // Verificar condiciones de victoria/derrota
        this.checkGameConditions();
    }

    /**
     * Actualiza el mini-radar
     */
    updateRadar() {
        const ctx = this.radarCtx;
        const canvas = this.radarCanvas;
        
        // Limpiar
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fondo
        ctx.fillStyle = 'rgba(0, 20, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Escala
        const scale = 3;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Jugador (centro, verde)
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Enemigos (rojos)
        this.enemies.forEach(enemy => {
            const relativePos = enemy.position.subtract(this.player.position);
            const radarX = centerX + relativePos.x * scale;
            const radarY = centerY + relativePos.z * scale;
            
            // Solo mostrar si están en rango
            if (Math.abs(relativePos.x) < 20 && Math.abs(relativePos.z) < 20) {
                ctx.fillStyle = enemy.state === 'ALERT' ? '#ff0000' : '#ff8800';
                ctx.beginPath();
                ctx.arc(radarX, radarY, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Dirección del enemigo
                const dirAngle = enemy.mesh.rotation.y;
                const dirX = Math.sin(dirAngle) * 8;
                const dirY = Math.cos(dirAngle) * 8;
                
                ctx.strokeStyle = enemy.state === 'ALERT' ? '#ff0000' : '#ff8800';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(radarX, radarY);
                ctx.lineTo(radarX + dirX, radarY + dirY);
                ctx.stroke();
            }
        });
        
        // Objetivo (amarillo)
        const goalRelative = this.goalPosition.subtract(this.player.position);
        const goalX = centerX + goalRelative.x * scale;
        const goalY = centerY + goalRelative.z * scale;
        
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(goalX, goalY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Verifica condiciones de victoria/derrota
     */
    checkGameConditions() {
        if (this.gameState !== 'PLAYING') return;
        
        // Victoria: llegar al objetivo (sin importar el estado)
        if (this.player.checkGoalReached(this.goalPosition, 3)) {
            const state = this.stealthSystem.getState();
            let message = 'Has llegado al objetivo.';
            
            // Mensaje diferente según el estado
            if (state === 'INFILTRATION') {
                message = '¡Infiltración perfecta! Sin ser detectado.';
            } else if (state === 'CAUTION') {
                message = 'Has llegado con precaución. Buen trabajo.';
            } else if (state === 'EVASION') {
                message = '¡Escapaste justo a tiempo!';
            } else if (state === 'ALERT') {
                message = '¡Lo lograste bajo presión!';
            }
            
            this.showGameMessage('MISIÓN COMPLETADA', message, 'success');
            this.gameState = 'WIN';
            return;
        }
        
        // Derrota: ser visto por 5 segundos completos
        for (let enemy of this.enemies) {
            if (enemy.isPlayerFullyDetected()) {
                this.showGameMessage('¡DESCUBIERTO!', 'Fuiste visto por demasiado tiempo. Los guardias te han capturado.', 'failure');
                this.gameState = 'LOSE';
                return;
            }
        }
        
        // Derrota: enemigo muy cerca en alerta
        if (this.stealthSystem.getState() === 'ALERT') {
            for (let enemy of this.enemies) {
                const distance = BABYLON.Vector3.Distance(this.player.position, enemy.position);
                if (distance < 1.5) {
                    this.showGameMessage('MISIÓN FALLIDA', 'Has sido capturado por los guardias.', 'failure');
                    this.gameState = 'LOSE';
                    return;
                }
            }
        }
    }

    /**
     * Muestra mensaje de juego terminado
     */
    showGameMessage(title, text, type) {
        const messageDiv = document.getElementById('gameMessage');
        const titleElement = document.getElementById('messageTitle');
        const textElement = document.getElementById('messageText');
        
        titleElement.textContent = title;
        textElement.textContent = text;
        
        messageDiv.className = type;
        messageDiv.style.display = 'block';
    }
}

// Iniciar el juego cuando cargue la página
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
