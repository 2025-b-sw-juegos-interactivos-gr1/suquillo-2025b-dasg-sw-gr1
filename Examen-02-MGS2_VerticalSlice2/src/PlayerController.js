/**
 * PLAYER CONTROLLER
 * Implementa movilidad táctica del jugador:
 * - Caminar, correr, agacharse
 * - Control de cámara
 * - Detección de entrada en sombras
 * 
 * Basado en Épica 01 del GDD
 */

class PlayerController {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Estado del jugador
        this.position = new BABYLON.Vector3(0, 0, 0);
        this.isCrouching = false;
        this.isRunning = false;
        this.isMoving = false;
        
        // Velocidades (Épica 01)
        this.walkSpeed = 0.1;
        this.runSpeed = 0.5;
        this.crouchSpeed = 0.05;
        
        // Mesh del jugador
        this.mesh = null;
        this.createPlayerMesh();
        
        // Input
        this.keys = {};
        this.setupInput();
        
        // Objetivo de la misión
        this.hasReachedGoal = false;
    }

    /**
     * Crea la representación visual del jugador
     */
    createPlayerMesh() {
        // Crear collider como mesh principal para colisiones
        this.collider = BABYLON.MeshBuilder.CreateCapsule("playerCollider", {
            height: 1.8,
            radius: 0.4
        }, this.scene);
        this.collider.position = this.position.clone();
        this.collider.isVisible = false;
        this.collider.checkCollisions = true;
        this.collider.ellipsoid = new BABYLON.Vector3(0.4, 0.9, 0.4);
        
        // Crear contenedor para el modelo visual como hijo del collider
        this.mesh = new BABYLON.TransformNode("player", this.scene);
        this.mesh.parent = this.collider;
        
        // Habilitar colisiones en la escena
        this.scene.collisionsEnabled = true;
        
        // Intentar cargar modelo GLTF de Solid Snake
        this.loadPlayerModel();
        
        // Mientras tanto, crear placeholder
        this.createPlaceholder();
    }
    
    /**
     * Crea un placeholder temporal mientras carga el modelo
     */
    createPlaceholder() {
        const placeholder = BABYLON.MeshBuilder.CreateCapsule("playerPlaceholder", {
            height: 1.8,
            radius: 0.3
        }, this.scene);
        
        const playerMat = new BABYLON.StandardMaterial("playerMat", this.scene);
        playerMat.diffuseColor = new BABYLON.Color3(0, 0.5, 0.8);
        playerMat.emissiveColor = new BABYLON.Color3(0, 0.2, 0.3);
        placeholder.material = playerMat;
        
        placeholder.parent = this.mesh;
        this.placeholder = placeholder;
        
        // Dirección visual
        const direction = BABYLON.MeshBuilder.CreateCylinder("direction", {
            height: 0.5,
            diameterTop: 0,
            diameterBottom: 0.3
        }, this.scene);
        direction.parent = this.mesh;
        direction.position.z = 0.5;
        direction.rotation.x = Math.PI / 2;
        direction.material = playerMat;
        this.directionMesh = direction;
    }
    
    /**
     * Carga el modelo GLTF de Solid Snake
     */
    loadPlayerModel() {
        // Modelo de Solid Snake (Twin Snakes)
        const modelPath = "assets/models/metal_gear_solid_the_twin_snakes_solid_snake/";
        const modelFile = "scene.gltf";
        
        BABYLON.SceneLoader.ImportMesh("", modelPath, modelFile, this.scene, 
            (meshes) => {
                console.log("Modelo de Solid Snake cargado exitosamente");
                
                // Ocultar placeholder y dirección
                if (this.placeholder) {
                    this.placeholder.isVisible = false;
                }
                if (this.directionMesh) {
                    this.directionMesh.isVisible = false;
                }
                
                // Configurar modelo - ajustar escala según el modelo GLTF
                // El modelo de Sketchfab viene en escala grande
                const rootMesh = meshes[0];
                rootMesh.parent = this.mesh;
                rootMesh.scaling = new BABYLON.Vector3(0.001, 0.001, 0.001);
                rootMesh.position.y = 0.08; // Al nivel del suelo
                
                this.modelMeshes = meshes;
            },
            null, // onProgress
            (scene, message) => {
                console.log("No se pudo cargar el modelo de Solid Snake, usando placeholder");
                console.log(message);
            }
        );
    }

    /**
     * Configura el sistema de input
     */
    setupInput() {
        // Keyboard
        this.scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    this.keys[kbInfo.event.key.toLowerCase()] = true;
                    
                    // Shift para correr
                    if (kbInfo.event.key === 'Shift') {
                        this.isRunning = true;
                    }
                    
                    // Control para agacharse
                    if (kbInfo.event.key === 'Control') {
                        this.toggleCrouch();
                    }
                    
                    // ESC para reiniciar
                    if (kbInfo.event.key === 'Escape') {
                        location.reload();
                    }
                    break;
                    
                case BABYLON.KeyboardEventTypes.KEYUP:
                    this.keys[kbInfo.event.key.toLowerCase()] = false;
                    
                    if (kbInfo.event.key === 'Shift') {
                        this.isRunning = false;
                    }
                    break;
            }
        });
        
        // Mouse para rotación de cámara
        this.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
    }

    /**
     * Alternar agacharse
     */
    toggleCrouch() {
        this.isCrouching = !this.isCrouching;
        
        // Ajustar altura del collider y modelo
        if (this.isCrouching) {
            this.collider.scaling.y = 0.6;
        } else {
            this.collider.scaling.y = 1.0;
        }
    }

    /**
     * Actualiza el movimiento del jugador
     */
    update() {
        // Vector de movimiento
        let moveVector = new BABYLON.Vector3(0, 0, 0);
        this.isMoving = false;
        
        // WASD movement
        if (this.keys['w']) {
            moveVector.z += 1;
            this.isMoving = true;
        }
        if (this.keys['s']) {
            moveVector.z -= 1;
            this.isMoving = true;
        }
        if (this.keys['a']) {
            moveVector.x -= 1;
            this.isMoving = true;
        }
        if (this.keys['d']) {
            moveVector.x += 1;
            this.isMoving = true;
        }
        
        // Normalizar para movimiento diagonal consistente
        if (moveVector.length() > 0) {
            moveVector.normalize();
            
            // Aplicar velocidad según estado
            let speed = this.walkSpeed;
            if (this.isCrouching) {
                speed = this.crouchSpeed;
            } else if (this.isRunning) {
                speed = this.runSpeed;
            }
            
            // Transformar según rotación de cámara
            const forward = this.camera.getDirection(BABYLON.Axis.Z);
            const right = this.camera.getDirection(BABYLON.Axis.X);
            
            forward.y = 0;
            right.y = 0;
            forward.normalize();
            right.normalize();
            
            const movement = forward.scale(moveVector.z).add(right.scale(moveVector.x));
            movement.scaleInPlace(speed);
            
            // Aplicar movimiento CON COLISIONES
            this.collider.moveWithCollisions(movement);
            
            // Rotar jugador hacia dirección de movimiento
            if (movement.length() > 0) {
                const targetRotation = Math.atan2(movement.x, movement.z) + Math.PI;
                this.collider.rotation.y = targetRotation;
            }
        }
        
        // Sincronizar cámara con jugador (usar collider que es el que se mueve)
        this.camera.position.x = this.collider.position.x;
        this.camera.position.z = this.collider.position.z - 3;
        this.camera.position.y = this.collider.position.y + 2;
        
        // Actualizar posición
        this.position = this.collider.position.clone();
    }

    /**
     * Verifica si llegó al objetivo
     */
    checkGoalReached(goalPosition, radius = 2) {
        const distance = BABYLON.Vector3.Distance(this.position, goalPosition);
        if (distance < radius) {
            this.hasReachedGoal = true;
            return true;
        }
        return false;
    }

    /**
     * Obtiene la dirección hacia donde mira el jugador
     */
    getForwardDirection() {
        const forward = new BABYLON.Vector3(
            Math.sin(this.collider.rotation.y),
            0,
            Math.cos(this.collider.rotation.y)
        );
        return forward;
    }

    /**
     * Reset del jugador
     */
    reset(startPosition) {
        this.collider.position = startPosition.clone();
        this.position = startPosition.clone();
        this.isCrouching = false;
        this.isRunning = false;
        this.isMoving = false;
        this.hasReachedGoal = false;
        
        if (this.collider.scaling.y !== 1.0) {
            this.collider.scaling.y = 1.0;
            this.collider.position.y = 1.0;
        }
    }

    /**
     * Destruir jugador
     */
    dispose() {
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
}
