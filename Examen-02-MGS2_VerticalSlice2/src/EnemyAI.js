/**
 * ENEMY AI
 * Implementa inteligencia artificial enemiga con:
 * - Patrullaje por rutas definidas
 * - Detección visual del jugador (cono de visión)
 * - Estados: PATROL, ALERT, SEARCH, CAUTION
 * - Coordinación entre enemigos
 * 
 * Basado en Épica 03 del GDD
 */

class EnemyAI {
    constructor(scene, spawnPosition, patrolPoints, id) {
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
        
        // Patrullaje
        this.patrolPoints = patrolPoints;
        this.currentPatrolIndex = 0;
        this.patrolSpeed = 0.03;
        this.rotationSpeed = 0.05;
        
        // Visión (Épica 03 - IA avanzada)
        this.viewDistance = 15; // Alcance de visión
        this.viewAngle = 60; // Grados de cono de visión
        this.detectionThreshold = 0.7; // Cuánto debe ver para detectar
        
        // Referencias
        this.mesh = null;
        this.visionCone = null;
        this.alertIndicator = null;
        
        // Búsqueda
        this.lastKnownPlayerPosition = null;
        this.searchTimer = 0;
        this.searchDuration = 10;
        
        this.createEnemyMesh();
    }

    /**
     * Crea la representación visual del enemigo
     */
    createEnemyMesh() {
        // Contenedor principal
        this.mesh = new BABYLON.TransformNode(`enemy_${this.id}`, this.scene);
        this.mesh.position = this.position;
        
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
     * Carga el modelo GLB del enemigo
     */
    loadEnemyModel() {
        const modelURL = "assets/models/enemy.glb";
        
        BABYLON.SceneLoader.ImportMesh("", "", modelURL, this.scene,
            (meshes) => {
                console.log(`Modelo del enemigo ${this.id} cargado`);
                
                // Ocultar placeholder
                if (this.placeholder) {
                    this.placeholder.isVisible = false;
                }
                
                // Configurar modelo
                meshes.forEach(mesh => {
                    mesh.parent = this.mesh;
                    mesh.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
                    mesh.rotation.y = Math.PI;
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
        
        this.visionCone.parent = this.mesh;
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
     */
    canSeePlayer(player) {
        const playerPos = player.position;
        const enemyPos = this.position;
        
        // Vector hacia el jugador
        const toPlayer = playerPos.subtract(enemyPos);
        const distance = toPlayer.length();
        
        // Demasiado lejos
        if (distance > this.viewDistance) {
            return false;
        }
        
        // Dirección hacia donde mira el enemigo
        const forward = new BABYLON.Vector3(
            Math.sin(this.mesh.rotation.y),
            0,
            Math.cos(this.mesh.rotation.y)
        );
        
        // Normalizar vectores
        toPlayer.normalize();
        forward.normalize();
        
        // Calcular ángulo
        const dotProduct = BABYLON.Vector3.Dot(forward, toPlayer);
        const angle = Math.acos(dotProduct) * (180 / Math.PI);
        
        // Está dentro del cono de visión?
        if (angle > this.viewAngle) {
            return false;
        }
        
        // Raycast para verificar obstrucciones
        const ray = new BABYLON.Ray(enemyPos, toPlayer, distance);
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            return mesh !== this.mesh && 
                   mesh !== this.visionCone && 
                   mesh !== this.alertIndicator &&
                   mesh !== player.mesh;
        });
        
        // Si hay obstrucción, no puede ver
        if (hit && hit.hit) {
            return false;
        }
        
        return true;
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
            return;
        }
        
        // Moverse hacia el punto
        toTarget.normalize();
        this.mesh.position.addInPlace(toTarget.scale(this.patrolSpeed));
        
        // Rotar hacia el punto
        const targetRotation = Math.atan2(toTarget.x, toTarget.z);
        const currentRotation = this.mesh.rotation.y;
        
        let rotationDiff = targetRotation - currentRotation;
        
        // Normalizar diferencia de rotación
        while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
        while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
        
        this.mesh.rotation.y += rotationDiff * this.rotationSpeed;
        
        this.position = this.mesh.position.clone();
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
                this.mesh.position.addInPlace(toLastKnown.scale(this.patrolSpeed * 1.5));
                
                // Rotar
                const targetRotation = Math.atan2(toLastKnown.x, toLastKnown.z);
                this.mesh.rotation.y = targetRotation;
            }
        }
        
        // Si se acaba el tiempo, volver a patrullar
        if (this.searchTimer <= 0) {
            this.setState('PATROL');
        }
        
        this.position = this.mesh.position.clone();
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
            // Moverse más rápido en alerta
            this.mesh.position.addInPlace(toPlayer.scale(this.patrolSpeed * 2));
            
            // Rotar hacia jugador
            const targetRotation = Math.atan2(toPlayer.x, toPlayer.z);
            this.mesh.rotation.y = targetRotation;
        }
        
        this.position = this.mesh.position.clone();
    }

    /**
     * Actualiza la IA cada frame
     */
    update(deltaTime, player) {
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
     * Destruir enemigo
     */
    dispose() {
        if (this.mesh) this.mesh.dispose();
        if (this.visionCone) this.visionCone.dispose();
        if (this.alertIndicator) this.alertIndicator.dispose();
    }
}
