/**
 * STEALTH SYSTEM
 * Implementa los estados de alerta del MGS2:
 * - INFILTRATION: Estado normal, enemigos en patrulla
 * - ALERT: Jugador detectado, enemigos atacan
 * - EVASION: Jugador perdió línea de vista, enemigos buscan
 * - CAUTION: Enemigos sospechan, buscan activamente
 * 
 * Basado en Épica 02 del GDD
 */

class StealthSystem {
    constructor(scene) {
        this.scene = scene;
        this.currentState = 'INFILTRATION';
        this.alertTimer = 0;
        this.maxAlertTime = 30; // 30 segundos de alerta
        this.evasionTimer = 0;
        this.maxEvasionTime = 15; // 15 segundos de evasión
        
        // Sistema de iluminación para stealth (Épica 05)
        this.lightAreas = [];
        this.shadowAreas = [];
        
        // UI Elements
        this.alertStatusElement = document.getElementById('alertStatus');
        
        // Audio feedback (simulado)
        this.soundEnabled = true;
    }

    /**
     * Verifica si el jugador está en sombras
     * Épica 05: Iluminación y sombras
     */
    isPlayerInShadow(playerPosition) {
        // Buscar áreas de sombra cercanas
        for (let shadow of this.shadowAreas) {
            const distance = BABYLON.Vector3.Distance(playerPosition, shadow.position);
            if (distance < shadow.radius) {
                return true;
            }
        }
        return false;
    }

    /**
     * Calcula visibilidad del jugador basado en luz y movimiento
     */
    calculatePlayerVisibility(player, enemy) {
        let visibility = 1.0; // 100% visible por defecto
        
        // Reducir visibilidad si está en sombras (Épica 05)
        if (this.isPlayerInShadow(player.position)) {
            visibility *= 0.3; // 70% menos visible en sombras
        }
        
        // Reducir visibilidad si está agachado
        if (player.isCrouching) {
            visibility *= 0.5; // 50% menos visible
        }
        
        // Aumentar visibilidad si está corriendo (hace ruido)
        if (player.isRunning) {
            visibility *= 1.8; // Más detectable
        }
        
        // Factor de distancia
        const distance = BABYLON.Vector3.Distance(player.position, enemy.position);
        const maxDetectionRange = 20;
        visibility *= Math.max(0, 1 - (distance / maxDetectionRange));
        
        return Math.min(1.0, Math.max(0, visibility));
    }

    /**
     * Transiciones entre estados
     */
    setState(newState) {
        if (this.currentState === newState) return;
        
        console.log(`Estado cambiado: ${this.currentState} -> ${newState}`);
        this.currentState = newState;
        
        // Actualizar UI
        this.updateUI();
        
        // Trigger eventos según estado
        switch(newState) {
            case 'ALERT':
                this.onAlert();
                break;
            case 'EVASION':
                this.onEvasion();
                break;
            case 'CAUTION':
                this.onCaution();
                break;
            case 'INFILTRATION':
                this.onInfiltration();
                break;
        }
    }

    /**
     * Jugador detectado - ALERT MODE
     */
    onAlert() {
        this.alertTimer = this.maxAlertTime;
        console.log('¡ALERTA! Jugador detectado');
        
        // Sonido de alerta (simulado)
        if (this.soundEnabled) {
            console.log('🔊 ALERT SOUND');
        }
    }

    /**
     * Jugador perdió visión - EVASION MODE
     */
    onEvasion() {
        this.evasionTimer = this.maxEvasionTime;
        console.log('Modo Evasión - Buscando al intruso...');
    }

    /**
     * Enemigos sospechan - CAUTION MODE
     */
    onCaution() {
        console.log('Modo Precaución - Investigando...');
    }

    /**
     * Vuelta a la normalidad - INFILTRATION MODE
     */
    onInfiltration() {
        console.log('Infiltración exitosa');
        this.alertTimer = 0;
        this.evasionTimer = 0;
    }

    /**
     * Actualiza el sistema cada frame
     */
    update(deltaTime, player, enemies) {
        switch(this.currentState) {
            case 'INFILTRATION':
                this.updateInfiltration(player, enemies);
                break;
            case 'ALERT':
                this.updateAlert(deltaTime, player, enemies);
                break;
            case 'EVASION':
                this.updateEvasion(deltaTime, player, enemies);
                break;
            case 'CAUTION':
                this.updateCaution(deltaTime, player, enemies);
                break;
        }
    }

    /**
     * Lógica de detección en modo infiltración
     */
    updateInfiltration(player, enemies) {
        for (let enemy of enemies) {
            const visibility = this.calculatePlayerVisibility(player, enemy);
            const canSee = enemy.canSeePlayer(player);
            
            if (canSee && visibility > 0.7) {
                // Jugador detectado
                this.setState('ALERT');
                enemy.setState('ALERT');
                return;
            } else if (canSee && visibility > 0.3) {
                // Sospecha
                this.setState('CAUTION');
                return;
            }
        }
    }

    /**
     * Lógica durante alerta
     */
    updateAlert(deltaTime, player, enemies) {
        this.alertTimer -= deltaTime;
        
        let anyCanSee = false;
        for (let enemy of enemies) {
            if (enemy.canSeePlayer(player)) {
                anyCanSee = true;
                this.alertTimer = this.maxAlertTime; // Reset timer
                break;
            }
        }
        
        // Si perdemos vista del jugador, cambiar a evasión
        if (!anyCanSee) {
            this.setState('EVASION');
            enemies.forEach(e => e.setState('SEARCH'));
        }
        
        // Si pasa mucho tiempo, volver a caution
        if (this.alertTimer <= 0) {
            this.setState('CAUTION');
        }
    }

    /**
     * Lógica durante evasión
     */
    updateEvasion(deltaTime, player, enemies) {
        this.evasionTimer -= deltaTime;
        
        // Si nos ven de nuevo, volver a alerta
        for (let enemy of enemies) {
            if (enemy.canSeePlayer(player)) {
                this.setState('ALERT');
                return;
            }
        }
        
        // Si pasa el tiempo, reducir a caution
        if (this.evasionTimer <= 0) {
            this.setState('CAUTION');
            enemies.forEach(e => e.setState('CAUTION'));
        }
    }

    /**
     * Lógica durante precaución
     */
    updateCaution(deltaTime, player, enemies) {
        // Volver gradualmente a infiltración
        // O detectar de nuevo si el jugador es imprudente
        
        let anyAware = false;
        for (let enemy of enemies) {
            const visibility = this.calculatePlayerVisibility(player, enemy);
            const canSee = enemy.canSeePlayer(player);
            
            if (canSee && visibility > 0.8) {
                this.setState('ALERT');
                return;
            } else if (canSee && visibility > 0.4) {
                anyAware = true;
            }
        }
        
        if (!anyAware) {
            // Volver a infiltración después de un tiempo
            setTimeout(() => {
                if (this.currentState === 'CAUTION') {
                    this.setState('INFILTRATION');
                    enemies.forEach(e => e.setState('PATROL'));
                }
            }, 5000);
        }
    }

    /**
     * Actualiza el UI según el estado
     */
    updateUI() {
        this.alertStatusElement.className = '';
        
        switch(this.currentState) {
            case 'INFILTRATION':
                this.alertStatusElement.textContent = 'INFILTRACIÓN';
                this.alertStatusElement.style.borderColor = '#00ff00';
                this.alertStatusElement.style.color = '#00ff00';
                break;
            case 'ALERT':
                this.alertStatusElement.textContent = '¡ALERTA!';
                this.alertStatusElement.classList.add('alert');
                break;
            case 'EVASION':
                this.alertStatusElement.textContent = 'EVASIÓN';
                this.alertStatusElement.classList.add('evasion');
                break;
            case 'CAUTION':
                this.alertStatusElement.textContent = 'PRECAUCIÓN';
                this.alertStatusElement.style.borderColor = '#ffaa00';
                this.alertStatusElement.style.color = '#ffaa00';
                break;
        }
    }

    /**
     * Registra áreas de sombra en el nivel (Épica 05)
     */
    addShadowArea(position, radius) {
        this.shadowAreas.push({
            position: position,
            radius: radius
        });
    }

    /**
     * Obtiene estado actual
     */
    getState() {
        return this.currentState;
    }
}
