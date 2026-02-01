/**
 * ENEMY FACTORY
 * Patrón Factory + Builder para crear diferentes tipos de enemigos
 * 
 * Tipos de enemigos:
 * - NINJA: Visión corta y ancha, movimiento rápido (Gray Fox)
 * - GUARD: Visión larga y estrecha, movimiento lento (Guardia estándar)
 * - SNIPER: Visión muy larga pero muy estrecha, estático
 * 
 * Cada tipo tiene configuraciones predefinidas que pueden personalizarse
 */

class EnemyFactory {
    /**
     * Configuraciones predefinidas para cada tipo de enemigo
     */
    static PRESETS = {
        NINJA: {
            viewDistance: 5,
            viewAngle: 45,
            patrolSpeed: 0.05,
            detectionTime: 3,
            modelType: 'grayFox',
            modelConfig: {
                path: "assets/models/ninja_gray_fox/",
                file: "scene.gltf",
                scaling: new BABYLON.Vector3(0.0012, 0.0012, 0.0012),
                positionY: -1.05,
                positionZ: -6.4,
                rotationY: 0
            }
        },
        GUARD: {
            viewDistance: 7,
            viewAngle: 35,
            patrolSpeed: 0.03,
            detectionTime: 5,
            modelType: 'standard',
            modelConfig: {
                path: "",
                file: "assets/models/enemy.glb",
                scaling: new BABYLON.Vector3(0.01, 0.01, 0.01),
                positionY: -1.0,
                positionZ: 0,
                rotationY: Math.PI
            }
        },
        SNIPER: {
            viewDistance: 10,
            viewAngle: 15,
            patrolSpeed: 0,
            detectionTime: 2,
            modelType: 'standard',
            modelConfig: {
                path: "",
                file: "assets/models/enemy.glb",
                scaling: new BABYLON.Vector3(0.01, 0.01, 0.01),
                positionY: -1.0,
                positionZ: 0,
                rotationY: Math.PI
            }
        }
    };

    /**
     * Crea un enemigo usando un preset predefinido
     * @param {string} type - Tipo de enemigo: 'NINJA', 'GUARD', 'SNIPER'
     * @param {BABYLON.Scene} scene - Escena de Babylon.js
     * @param {BABYLON.Vector3} spawnPosition - Posición inicial
     * @param {BABYLON.Vector3[]} patrolPoints - Puntos de patrulla
     * @param {number} id - ID único del enemigo
     * @returns {EnemyAI} - Instancia del enemigo configurado
     */
    static create(type, scene, spawnPosition, patrolPoints, id) {
        const preset = this.PRESETS[type.toUpperCase()];
        
        if (!preset) {
            console.warn(`Tipo de enemigo '${type}' no reconocido. Usando GUARD por defecto.`);
            return this.create('GUARD', scene, spawnPosition, patrolPoints, id);
        }

        const config = {
            viewDistance: preset.viewDistance,
            viewAngle: preset.viewAngle,
            patrolSpeed: preset.patrolSpeed,
            detectionTime: preset.detectionTime,
            modelType: preset.modelType,
            modelConfig: { ...preset.modelConfig }
        };

        return new EnemyAI(scene, spawnPosition, patrolPoints, id, config);
    }

    /**
     * Builder para crear enemigos personalizados
     * @param {BABYLON.Scene} scene - Escena de Babylon.js
     * @returns {EnemyBuilder} - Builder para configuración fluida
     */
    static builder(scene) {
        return new EnemyBuilder(scene);
    }

    /**
     * Atajos para crear tipos específicos
     */
    static createNinja(scene, spawnPosition, patrolPoints, id) {
        return this.create('NINJA', scene, spawnPosition, patrolPoints, id);
    }

    static createGuard(scene, spawnPosition, patrolPoints, id) {
        return this.create('GUARD', scene, spawnPosition, patrolPoints, id);
    }

    static createSniper(scene, spawnPosition, patrolPoints, id) {
        return this.create('SNIPER', scene, spawnPosition, patrolPoints, id);
    }
}

/**
 * ENEMY BUILDER
 * Permite construir enemigos con configuración personalizada paso a paso
 */
class EnemyBuilder {
    constructor(scene) {
        this.scene = scene;
        this.config = {
            viewDistance: 15,
            viewAngle: 60,
            patrolSpeed: 0.03,
            detectionTime: 5,
            modelType: 'standard',
            modelConfig: {
                path: "",
                file: "assets/models/enemy.glb",
                scaling: new BABYLON.Vector3(0.01, 0.01, 0.01),
                positionY: -1.0,
                positionZ: 0,
                rotationY: Math.PI
            }
        };
        this.spawnPosition = new BABYLON.Vector3(0, 1, 0);
        this.patrolPoints = [];
        this.id = 0;
    }

    /**
     * Configura la distancia de visión
     */
    setViewDistance(distance) {
        this.config.viewDistance = distance;
        return this;
    }

    /**
     * Configura el ángulo del cono de visión
     */
    setViewAngle(angle) {
        this.config.viewAngle = angle;
        return this;
    }

    /**
     * Configura la velocidad de patrullaje
     */
    setPatrolSpeed(speed) {
        this.config.patrolSpeed = speed;
        return this;
    }

    /**
     * Configura el tiempo para detección completa
     */
    setDetectionTime(seconds) {
        this.config.detectionTime = seconds;
        return this;
    }

    /**
     * Usa el modelo de Gray Fox (Ninja)
     */
    useNinjaModel() {
        this.config.modelType = 'grayFox';
        this.config.modelConfig = {
            path: "assets/models/ninja_gray_fox/",
            file: "scene.gltf",
            scaling: new BABYLON.Vector3(0.0012, 0.0012, 0.0012),
            positionY: -1.05,
            positionZ: -6.4,
            rotationY: 0
        };
        return this;
    }

    /**
     * Usa el modelo estándar de guardia
     */
    useGuardModel() {
        this.config.modelType = 'standard';
        this.config.modelConfig = {
            path: "",
            file: "assets/models/enemy.glb",
            scaling: new BABYLON.Vector3(0.01, 0.01, 0.01),
            positionY: -1.0,
            positionZ: 0,
            rotationY: Math.PI
        };
        return this;
    }

    /**
     * Configura la posición inicial
     */
    setSpawnPosition(position) {
        this.spawnPosition = position;
        return this;
    }

    /**
     * Configura los puntos de patrulla
     */
    setPatrolPoints(points) {
        this.patrolPoints = points;
        return this;
    }

    /**
     * Configura el ID del enemigo
     */
    setId(id) {
        this.id = id;
        return this;
    }

    /**
     * Construye el enemigo con la configuración actual
     */
    build() {
        return new EnemyAI(
            this.scene,
            this.spawnPosition,
            this.patrolPoints,
            this.id,
            this.config
        );
    }
}
