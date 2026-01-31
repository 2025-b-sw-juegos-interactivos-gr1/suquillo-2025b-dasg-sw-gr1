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
        // Crear un contenedor para el modelo
        this.mesh = new BABYLON.TransformNode("player", this.scene);
        this.mesh.position = this.position;
        this.mesh.checkCollisions = true;
        
        // Intentar cargar modelo GLB
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
    }
    
    /**
     * Carga el modelo GLB del jugador
     */
    loadPlayerModel() {
        // Puedes cambiar esta URL por tu propio modelo
        const modelURL = "assets/models/player.glb";
        
        BABYLON.SceneLoader.ImportMesh("", "", modelURL, this.scene, 
            (meshes) => {
                console.log("Modelo del jugador cargado exitosamente");
                
                // Ocultar placeholder
                if (this.placeholder) {
                    this.placeholder.isVisible = false;
                }
                
                // Configurar modelo
                meshes.forEach(mesh => {
                    mesh.parent = this.mesh;
                    mesh.scaling = new BABYLON.Vector3(0.002, 0.002, 0.002);
                    mesh.position.y = -0.9; // Ajustar al nivel del suelo
                    mesh.rotation.y = Math.PI;
                });
                
                this.modelMeshes = meshes;
            },
            null, // onProgress
            (scene, message) => {
                console.log("No se pudo cargar el modelo del jugador, usando placeholder");
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
        
        // Ajustar altura del mesh
        if (this.isCrouching) {
            this.mesh.scaling.y = 0.6;
            this.mesh.position.y = 0.6;
        } else {
            this.mesh.scaling.y = 1.0;
            this.mesh.position.y = 1.0;
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
            
            // Aplicar movimiento
            this.mesh.position.addInPlace(movement);
            
            // Rotar jugador hacia dirección de movimiento
            if (movement.length() > 0) {
                const targetRotation = Math.atan2(movement.x, movement.z);
                this.mesh.rotation.y = targetRotation;
            }
        }
        
        // Sincronizar cámara con jugador
        this.camera.position.x = this.mesh.position.x;
        this.camera.position.z = this.mesh.position.z - 3;
        this.camera.position.y = this.mesh.position.y + 2;
        
        // Actualizar posición
        this.position = this.mesh.position.clone();
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
            Math.sin(this.mesh.rotation.y),
            0,
            Math.cos(this.mesh.rotation.y)
        );
        return forward;
    }

    /**
     * Reset del jugador
     */
    reset(startPosition) {
        this.mesh.position = startPosition.clone();
        this.position = startPosition.clone();
        this.isCrouching = false;
        this.isRunning = false;
        this.isMoving = false;
        this.hasReachedGoal = false;
        
        if (this.mesh.scaling.y !== 1.0) {
            this.mesh.scaling.y = 1.0;
            this.mesh.position.y = 1.0;
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
