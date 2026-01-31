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
        
        // Cámara tercera persona
        this.camera = new BABYLON.ArcRotateCamera(
            "camera",
            -Math.PI / 2,
            Math.PI / 3,
            10,
            new BABYLON.Vector3(0, 0, 0),
            this.scene
        );
        
        this.camera.lowerRadiusLimit = 5;
        this.camera.upperRadiusLimit = 15;
        this.camera.lowerBetaLimit = 0.1;
        this.camera.upperBetaLimit = Math.PI / 2;
    }

    /**
     * Crea el nivel de demostración
     * Una sala rectangular con obstáculos
     */
    createLevel() {
        // Suelo
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 30,
            height: 40
        }, this.scene);
        
        const groundMat = new BABYLON.StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.35);
        groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
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
     * Crea las paredes de la sala
     */
    createWalls() {
        const wallMat = new BABYLON.StandardMaterial("wallMat", this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.45);
        
        const wallPositions = [
            { pos: new BABYLON.Vector3(0, 2, -20), size: new BABYLON.Vector3(30, 4, 0.5) },  // Norte
            { pos: new BABYLON.Vector3(0, 2, 20), size: new BABYLON.Vector3(30, 4, 0.5) },   // Sur
            { pos: new BABYLON.Vector3(-15, 2, 0), size: new BABYLON.Vector3(0.5, 4, 40) },  // Oeste
            { pos: new BABYLON.Vector3(15, 2, 0), size: new BABYLON.Vector3(0.5, 4, 40) }    // Este
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
     * Crea obstáculos en el nivel
     */
    createObstacles() {
        const boxMat = new BABYLON.StandardMaterial("boxMat", this.scene);
        boxMat.diffuseColor = new BABYLON.Color3(0.5, 0.4, 0.3);
        
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
     */
    setupLighting() {
        // Luz ambiental tenue
        const ambient = new BABYLON.HemisphericLight(
            "ambient",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambient.intensity = 0.3;
        
        // Luces puntuales (focos en el techo)
        const lightPositions = [
            new BABYLON.Vector3(-5, 4, 0),
            new BABYLON.Vector3(5, 4, 0),
            new BABYLON.Vector3(-5, 4, 10),
            new BABYLON.Vector3(5, 4, 10)
        ];
        
        lightPositions.forEach((pos, i) => {
            const light = new BABYLON.PointLight(`light_${i}`, pos, this.scene);
            light.intensity = 0.5;
            light.range = 10;
            
            // Representación visual
            const bulb = BABYLON.MeshBuilder.CreateSphere(`bulb_${i}`, {
                diameter: 0.3
            }, this.scene);
            bulb.position = pos;
            
            const bulbMat = new BABYLON.StandardMaterial(`bulbMat_${i}`, this.scene);
            bulbMat.emissiveColor = new BABYLON.Color3(1, 1, 0.8);
            bulb.material = bulbMat;
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
     * Crea los enemigos con rutas de patrullaje
     */
    createEnemies() {
        // Guardia 1 - Patrulla horizontal
        const patrol1 = [
            new BABYLON.Vector3(-8, 0, 5),
            new BABYLON.Vector3(8, 0, 5),
            new BABYLON.Vector3(8, 0, 12),
            new BABYLON.Vector3(-8, 0, 12)
        ];
        
        const enemy1 = new EnemyAI(
            this.scene,
            patrol1[0],
            patrol1,
            1
        );
        this.enemies.push(enemy1);
        
        // Guardia 2 - Patrulla vertical
        const patrol2 = [
            new BABYLON.Vector3(0, 0, 2),
            new BABYLON.Vector3(0, 0, 15)
        ];
        
        const enemy2 = new EnemyAI(
            this.scene,
            patrol2[0],
            patrol2,
            2
        );
        this.enemies.push(enemy2);
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
        // Victoria: llegar al objetivo sin ser detectado (o en infiltración)
        if (this.player.checkGoalReached(this.goalPosition, 3)) {
            if (this.stealthSystem.getState() === 'INFILTRATION' || 
                this.stealthSystem.getState() === 'CAUTION') {
                this.showGameMessage('MISIÓN COMPLETADA', 'Has infiltrado la sala sin ser detectado.', 'success');
                this.gameState = 'WIN';
            }
        }
        
        // Derrota: estar en alerta por mucho tiempo
        if (this.stealthSystem.getState() === 'ALERT') {
            // Verificar si algún enemigo está muy cerca
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
