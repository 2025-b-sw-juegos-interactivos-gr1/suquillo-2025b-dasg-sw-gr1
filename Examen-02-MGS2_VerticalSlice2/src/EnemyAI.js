/**
 * ENEMY AI
 * Implementa inteligencia artificial enemiga con:
 * - Patrullaje por rutas definidas
 * - Detección visual del jugador (cono de visión)
 * - Estados: PATROL, ALERT, SEARCH, CAUTION
 * - Coordinación entre enemigos
 * 
 * Basado en Épica 03 del GDD
 * Usa patrón Factory para configuración de tipos de enemigos
 */

class EnemyAI {
    /**
     * @param {BABYLON.Scene} scene - Escena de Babylon.js
     * @param {BABYLON.Vector3} spawnPosition - Posición inicial
     * @param {BABYLON.Vector3[]} patrolPoints - Puntos de patrulla
     * @param {number} id - ID único del enemigo
     * @param {Object} config - Configuración del Factory (opcional)
     */
    constructor(scene, spawnPosition, patrolPoints, id, config = null) {
        this.scene = scene;
        this.id = id;
        this.position = spawnPosition.clone();
        
        // Estados de IA
        this.state = 'PATROL';
        this.states = {
            PATROL: 'PATROL',
            ALERT: 'ALERT',
            SEARCH: 'SEARCH',
            CAUTION: 'CAUTION'
        };
        
        // Aplicar configuración del Factory o usar valores por defecto
        this.applyConfig(config);
        
        // Patrullaje
        this.patrolPoints = patrolPoints;
        this.currentPatrolIndex = 0;
        this.rotationSpeed = 0.05;
        
        // Referencias
        this.mesh = null;
        this.visionCone = null;
        this.alertIndicator = null;
        
        // Búsqueda
        this.lastKnownPlayerPosition = null;
        this.searchTimer = 0;
        this.searchDuration = 10;
        
        // Sistema de detección con temporizador
        this.detectionTimer = 0;
        this.isPlayerVisible = false;
        
        this.createEnemyMesh();
    }
    
    /**
     * Aplica la configuración del Factory
     */
    applyConfig(config) {
        if (config) {
            // Configuración desde Factory
            this.viewDistance = config.viewDistance || 15;
            this.viewAngle = config.viewAngle || 60;
            this.patrolSpeed = config.patrolSpeed || 0.03;
            this.maxDetectionTime = config.detectionTime || 5;
            this.modelType = config.modelType || 'standard';
            this.modelConfig = config.modelConfig || null;
        } else {
            // Valores por defecto (compatibilidad hacia atrás)
            this.viewDistance = 15;
            this.viewAngle = 60;
            this.patrolSpeed = 0.03;
            this.maxDetectionTime = 5;
            this.modelType = null; // Se determinará por ID
            this.modelConfig = null;
        }
        this.detectionThreshold = 0.7;
    }

    /**
     * Crea la representación visual del enemigo
     */
    createEnemyMesh() {
        // Crear mesh principal para el enemigo
        this.collider = BABYLON.MeshBuilder.CreateCapsule(`enemyCollider_${this.id}`, {
            height: 1.8,
            radius: 0.4
        }, this.scene);
        this.collider.position = this.position.clone();
        this.collider.isVisible = false;
        this.collider.checkCollisions = true;
        this.collider.ellipsoid = new BABYLON.Vector3(0.4, 0.9, 0.4);
        
        // Contador para detectar si está atascado
        this.stuckCounter = 0;
        this.lastPosition = this.position.clone();
        
        // Contenedor visual como hijo del collider
        this.mesh = new BABYLON.TransformNode(`enemy_${this.id}`, this.scene);
        this.mesh.parent = this.collider;
        
        // Cargar modelo GLB
        this.loadEnemyModel();
        
        // Placeholder mientras carga
        this.createEnemyPlaceholder();
        
        // Cono de visión (siempre visible para debug)
        this.createVisionCone();
        
        // Indicador de alerta
        this.createAlertIndicator();
    }
    
    /**
     * Crea placeholder temporal del enemigo
     */
    createEnemyPlaceholder() {
        const placeholder = BABYLON.MeshBuilder.CreateCapsule(`enemyPlaceholder_${this.id}`, {
            height: 1.8,
            radius: 0.3
        }, this.scene);
        
        const enemyMat = new BABYLON.StandardMaterial(`enemyMat_${this.id}`, this.scene);
        enemyMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0);
        enemyMat.emissiveColor = new BABYLON.Color3(0.3, 0.1, 0);
        placeholder.material = enemyMat;
        
        placeholder.parent = this.mesh;
        this.placeholder = placeholder;
    }
    
    /**
     * Carga el modelo del enemigo según configuración del Factory o ID
     */
    loadEnemyModel() {
        // Si hay configuración del Factory, usarla
        if (this.modelType && this.modelConfig) {
            if (this.modelType === 'grayFox') {
                this.loadGrayFoxModel();
            } else {
                this.loadStandardEnemyModel();
            }
            return;
        }
        
        // Compatibilidad hacia atrás: usar ID para determinar modelo
        if (this.id === 1) {
            // Enemigo 1: Gray Fox (Ninja)
            this.loadGrayFoxModel();
        } else {
            // Enemigo 2 y demás: enemy.glb
            this.loadStandardEnemyModel();
        }
    }
    
    /**
     * Carga el modelo de Gray Fox (Ninja)
     */
    loadGrayFoxModel() {
        // Usar configuración del Factory o valores por defecto
        const config = this.modelConfig || {
            path: "assets/models/ninja_gray_fox/",
            file: "scene.gltf",
            scaling: new BABYLON.Vector3(0.0012, 0.0012, 0.0012),
            positionY: -1.05,
            positionZ: -6.4,
            rotationY: 0
        };
        
        BABYLON.SceneLoader.ImportMesh("", config.path, config.file, this.scene,
            (meshes) => {
                console.log(`Modelo de Gray Fox (enemigo ${this.id}) cargado - Tipo: NINJA`);
                
                if (this.placeholder) {
                    this.placeholder.isVisible = false;
                }
                
                const rootMesh = meshes[0];
                rootMesh.parent = this.mesh;
                rootMesh.scaling = config.scaling.clone();
                rootMesh.position.y = config.positionY;
                rootMesh.position.z = config.positionZ;
                rootMesh.rotation.y = config.rotationY;
                
                this.modelMeshes = meshes;
            },
            null,
            (scene, message) => {
                console.log(`No se pudo cargar modelo de Gray Fox (enemigo ${this.id}), usando placeholder`);
            }
        );
    }
    
    /**
     * Carga el modelo estándar enemy.glb (Guardia)
     */
    loadStandardEnemyModel() {
        // Usar configuración del Factory o valores por defecto
        const config = this.modelConfig || {
            path: "",
            file: "assets/models/enemy.glb",
            scaling: new BABYLON.Vector3(0.01, 0.01, 0.01),
            positionY: -1.0,
            positionZ: 0,
            rotationY: Math.PI
        };
        
        BABYLON.SceneLoader.ImportMesh("", config.path, config.file, this.scene,
            (meshes) => {
                console.log(`Modelo de enemigo ${this.id} cargado - Tipo: GUARD`);
                
                if (this.placeholder) {
                    this.placeholder.isVisible = false;
                }
                
                meshes.forEach(mesh => {
                    mesh.parent = this.mesh;
                    mesh.scaling = config.scaling.clone();
                    mesh.rotation.y = config.rotationY;
                    mesh.position.y = config.positionY;
                    mesh.position.z = config.positionZ;
                });
                
                this.modelMeshes = meshes;
            },
            null,
            (scene, message) => {
                console.log(`No se pudo cargar modelo del enemigo ${this.id}, usando placeholder`);
            }
        );
    }

    /**
     * Crea un cono visual para mostrar el campo de visión
     */
    createVisionCone() {
        this.visionCone = BABYLON.MeshBuilder.CreateCylinder(`visionCone_${this.id}`, {
            height: this.viewDistance,
            diameterTop: this.viewDistance * Math.tan(this.viewAngle * Math.PI / 180),
            diameterBottom: 0.1
        }, this.scene);
        
        const coneMat = new BABYLON.StandardMaterial(`coneMat_${this.id}`, this.scene);
        coneMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
        coneMat.alpha = 0.1;
        coneMat.wireframe = true;
        this.visionCone.material = coneMat;
        
        // Ahora es hijo del collider para seguir su rotación
        this.visionCone.parent = this.collider;
        this.visionCone.position.z = this.viewDistance / 2;
        this.visionCone.rotation.x = Math.PI / 2;
    }

    /**
     * Crea indicador visual de alerta
     */
    createAlertIndicator() {
        this.alertIndicator = BABYLON.MeshBuilder.CreateCylinder(`alert_${this.id}`, {
            height: 0.1,
            diameter: 0.6
        }, this.scene);
        
        const alertMat = new BABYLON.StandardMaterial(`alertMat_${this.id}`, this.scene);
        alertMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
        this.alertIndicator.material = alertMat;
        
        this.alertIndicator.parent = this.mesh;
        this.alertIndicator.position.y = 1.2;
        this.alertIndicator.rotation.x = Math.PI / 2;
        this.alertIndicator.isVisible = false;
    }

    /**
     * Verifica si puede ver al jugador
     * Implementa detección por cono de visión
     * Tiene en cuenta las zonas de sombra (Épica 05)
     */
    canSeePlayer(player) {
        const playerPos = player.position;
        const enemyPos = this.position;
        
        // Verificar si el jugador está en zona de sombra
        if (this.isPlayerInShadow(playerPos)) {
            return false; // No puede ver al jugador en las sombras
        }
        
        // Vector hacia el jugador
        const toPlayer = playerPos.subtract(enemyPos);
        toPlayer.y = 0; // Ignorar diferencia de altura
        const distance = toPlayer.length();
        
        // Demasiado lejos
        if (distance > this.viewDistance) {
            return false;
        }
        
        // Dirección hacia donde mira el enemigo (usar collider.rotation)
        const forward = new BABYLON.Vector3(
            Math.sin(this.collider.rotation.y),
            0,
            Math.cos(this.collider.rotation.y)
        );
        
        // Normalizar vectores
        const toPlayerNorm = toPlayer.normalize();
        const forwardNorm = forward.normalize();
        
        // Calcular ángulo
        const dotProduct = BABYLON.Vector3.Dot(forwardNorm, toPlayerNorm);
        const angle = Math.acos(Math.min(1, Math.max(-1, dotProduct))) * (180 / Math.PI);
        
        // Está dentro del cono de visión?
        if (angle > this.viewAngle) {
            return false;
        }
        
        // El jugador está dentro del cono
        return true;
    }
    
    /**
     * Verifica si el jugador está en una zona de sombra
     * Las sombras ocultan completamente al jugador
     * @param {BABYLON.Vector3} playerPosition - Posición del jugador
     * @returns {boolean} - true si está en sombra
     */
    isPlayerInShadow(playerPosition) {
        // Zonas de sombra definidas en el nivel
        const shadowZones = [
            { pos: new BABYLON.Vector3(-8, 0.1, 5), radius: 3 },
            { pos: new BABYLON.Vector3(8, 0.1, 5), radius: 3 },
            { pos: new BABYLON.Vector3(-8, 0.1, 12), radius: 3 },
            { pos: new BABYLON.Vector3(8, 0.1, 12), radius: 3 }
        ];
        
        for (let shadow of shadowZones) {
            const distance = BABYLON.Vector3.Distance(
                new BABYLON.Vector3(playerPosition.x, 0, playerPosition.z),
                new BABYLON.Vector3(shadow.pos.x, 0, shadow.pos.z)
            );
            if (distance < shadow.radius) {
                return true;
            }
        }
        return false;
    }

    /**
     * Cambiar estado de IA
     */
    setState(newState) {
        if (this.state === newState) return;
        
        console.log(`Enemigo ${this.id}: ${this.state} -> ${newState}`);
        this.state = newState;
        
        // Cambiar indicador visual
        switch(newState) {
            case 'ALERT':
                this.alertIndicator.isVisible = true;
                this.alertIndicator.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
                break;
            case 'SEARCH':
                this.alertIndicator.isVisible = true;
                this.alertIndicator.material.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
                this.searchTimer = this.searchDuration;
                break;
            case 'CAUTION':
                this.alertIndicator.isVisible = true;
                this.alertIndicator.material.emissiveColor = new BABYLON.Color3(1, 1, 0);
                break;
            case 'PATROL':
                this.alertIndicator.isVisible = false;
                break;
        }
    }

    /**
     * Lógica de patrullaje
     */
    patrol() {
        const targetPoint = this.patrolPoints[this.currentPatrolIndex];
        const toTarget = targetPoint.subtract(this.position);
        const distance = toTarget.length();
        
        // Si llegamos al punto, ir al siguiente
        if (distance < 0.5) {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
            this.stuckCounter = 0;
            return;
        }
        
        // Guardar posición antes de mover
        const prevPosition = this.collider.position.clone();
        
        // Moverse hacia el punto con colisiones
        toTarget.normalize();
        const movement = toTarget.scale(this.patrolSpeed);
        this.collider.moveWithCollisions(movement);
        
        // Verificar si está atascado (no se movió lo suficiente)
        const moved = BABYLON.Vector3.Distance(prevPosition, this.collider.position);
        if (moved < this.patrolSpeed * 0.3) {
            this.stuckCounter++;
            // Si está atascado por mucho tiempo, saltar al siguiente punto
            if (this.stuckCounter > 60) { // ~1 segundo a 60fps
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
                this.stuckCounter = 0;
            }
        } else {
            this.stuckCounter = 0;
        }
        
        // Rotar hacia el punto
        const targetRotation = Math.atan2(toTarget.x, toTarget.z);
        const currentRotation = this.collider.rotation.y;
        
        let rotationDiff = targetRotation - currentRotation;
        
        // Normalizar diferencia de rotación
        while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
        while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
        
        this.collider.rotation.y += rotationDiff * this.rotationSpeed;
        
        this.position = this.collider.position.clone();
    }

    /**
     * Lógica de búsqueda activa
     */
    search(deltaTime) {
        this.searchTimer -= deltaTime;
        
        if (this.lastKnownPlayerPosition) {
            // Moverse hacia última posición conocida
            const toLastKnown = this.lastKnownPlayerPosition.subtract(this.position);
            const distance = toLastKnown.length();
            
            if (distance > 0.5) {
                toLastKnown.normalize();
                const movement = toLastKnown.scale(this.patrolSpeed * 1.5);
                this.collider.moveWithCollisions(movement);
                
                // Rotar
                const targetRotation = Math.atan2(toLastKnown.x, toLastKnown.z);
                this.collider.rotation.y = targetRotation;
            }
        }
        
        // Si se acaba el tiempo, volver a patrullar
        if (this.searchTimer <= 0) {
            this.setState('PATROL');
        }
        
        this.position = this.collider.position.clone();
    }

    /**
     * Lógica de alerta (perseguir)
     */
    alert(player) {
        const toPlayer = player.position.subtract(this.position);
        const distance = toPlayer.length();
        
        // Guardar última posición conocida
        this.lastKnownPlayerPosition = player.position.clone();
        
        if (distance > 0.8) {
            toPlayer.normalize();
            // Moverse más rápido en alerta con colisiones
            const movement = toPlayer.scale(this.patrolSpeed * 2);
            this.collider.moveWithCollisions(movement);
            
            // Rotar hacia jugador
            const targetRotation = Math.atan2(toPlayer.x, toPlayer.z);
            this.collider.rotation.y = targetRotation;
        }
        
        this.position = this.collider.position.clone();
    }

    /**
     * Actualiza la IA cada frame
     */
    update(deltaTime, player) {
        // Actualizar detección del jugador
        this.updateDetection(deltaTime, player);
        
        switch(this.state) {
            case 'PATROL':
                this.patrol();
                break;
            case 'ALERT':
                this.alert(player);
                break;
            case 'SEARCH':
                this.search(deltaTime);
                break;
            case 'CAUTION':
                // Búsqueda más lenta
                this.search(deltaTime);
                break;
        }
    }
    
    /**
     * Actualiza el sistema de detección con temporizador
     */
    updateDetection(deltaTime, player) {
        this.isPlayerVisible = this.canSeePlayer(player);
        
        if (this.isPlayerVisible) {
            // Acumular tiempo de detección
            this.detectionTimer += deltaTime;
            
            // Actualizar color del cono según el tiempo
            this.updateVisionConeColor();
            
            // Cambiar a estado de alerta si detectó por primera vez
            if (this.state === 'PATROL' && this.detectionTimer > 0.5) {
                this.setState('ALERT');
            }
        } else {
            // Reiniciar timer si pierde visión (decrementar gradualmente)
            this.detectionTimer = Math.max(0, this.detectionTimer - deltaTime * 2);
            this.updateVisionConeColor();
        }
    }
    
    /**
     * Actualiza el color del cono de visión según el nivel de detección
     */
    updateVisionConeColor() {
        if (!this.visionCone || !this.visionCone.material) return;
        
        const progress = this.detectionTimer / this.maxDetectionTime;
        
        if (progress <= 0) {
            // Normal - Amarillo
            this.visionCone.material.diffuseColor = new BABYLON.Color3(1, 1, 0);
            this.visionCone.material.alpha = 0.1;
        } else if (progress < 0.5) {
            // Detectando - Naranja
            this.visionCone.material.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
            this.visionCone.material.alpha = 0.2;
        } else if (progress < 1) {
            // Casi detectado - Rojo
            this.visionCone.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            this.visionCone.material.alpha = 0.3;
        } else {
            // Totalmente detectado - Rojo intenso
            this.visionCone.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            this.visionCone.material.alpha = 0.5;
        }
    }
    
    /**
     * Verifica si el jugador ha sido detectado completamente (5 segundos)
     */
    isPlayerFullyDetected() {
        return this.detectionTimer >= this.maxDetectionTime;
    }

    /**
     * Destruir enemigo
     */
    dispose() {
        if (this.collider) this.collider.dispose();
        if (this.mesh) this.mesh.dispose();
        if (this.visionCone) this.visionCone.dispose();
        if (this.alertIndicator) this.alertIndicator.dispose();
    }
}
