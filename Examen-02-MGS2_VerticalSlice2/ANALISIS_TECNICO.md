# Análisis Técnico - Vertical Slice MGS2

## 📋 Conexión con el Game Design Document

Este documento explica cómo el **Vertical Slice** implementa las mecánicas descritas en el GDD original de Metal Gear Solid 2, cumpliendo con los requisitos del examen final.

---

## 🎯 Alcance del Vertical Slice

### ¿Qué se implementó?

Este prototipo se enfoca en el **MVP (Minimum Viable Product)** definido en la Fase 1 del proyecto:

#### ✅ Épicas Implementadas (del GDD)

1. **Épica 01 - Control y movilidad táctica**
   - Archivo: `PlayerController.js`
   - Funcionalidad:
     - Movimiento con WASD
     - Velocidad variable (caminar/correr/agacharse)
     - Sistema de input responsivo
     - Rotación de cámara

2. **Épica 02 - Stealth y modos de alerta**
   - Archivo: `StealthSystem.js`
   - Funcionalidad:
     - 4 estados: INFILTRACIÓN, ALERTA, EVASIÓN, PRECAUCIÓN
     - Transiciones automáticas según detección
     - Timers para cambios de estado
     - Feedback visual (HUD)

3. **Épica 03 - Inteligencia artificial coordinada**
   - Archivo: `EnemyAI.js`
   - Funcionalidad:
     - Patrullaje por waypoints
     - Detección por cono de visión
     - Estados de IA (PATROL, ALERT, SEARCH, CAUTION)
     - Persecución al jugador

4. **Épica 05 - Iluminación y sombras**
   - Archivo: `StealthSystem.js` + `main.js`
   - Funcionalidad:
     - Zonas de sombra físicas
     - Cálculo de visibilidad reducida
     - Sistema de luces puntuales
     - Gameplay afectado por iluminación

---

## 🔧 Decisiones Técnicas

### 1. ¿Por qué Babylon.js y no Unity?

**Razones:**
- ✅ **Portabilidad**: Funciona en cualquier navegador sin instalación
- ✅ **Demostración rápida**: Ideal para presentar a stakeholders
- ✅ **Código accesible**: JavaScript es más fácil de revisar en el Code Review
- ✅ **Web-first**: Fácil de compartir con un simple link

**Trade-offs aceptados:**
- ❌ Física menos robusta que Unity PhysX
- ❌ Sin herramientas visuales (todo por código)
- ❌ Menor performance que motores nativos

**Justificación**: Para un Vertical Slice que valida mecánicas, la portabilidad y facilidad de demostración supera las limitaciones técnicas.

---

### 2. Sistema de Detección de Enemigos

#### Implementación del Cono de Visión

```javascript
// EnemyAI.js - línea ~150
canSeePlayer(player) {
    // 1. Distancia
    const toPlayer = playerPos.subtract(enemyPos);
    const distance = toPlayer.length();
    if (distance > this.viewDistance) return false;
    
    // 2. Ángulo (cono)
    const dotProduct = BABYLON.Vector3.Dot(forward, toPlayer);
    const angle = Math.acos(dotProduct) * (180 / Math.PI);
    if (angle > this.viewAngle) return false;
    
    // 3. Raycast (obstrucciones)
    const ray = new BABYLON.Ray(enemyPos, toPlayer, distance);
    const hit = this.scene.pickWithRay(ray);
    if (hit && hit.hit) return false;
    
    return true;
}
```

**Conexión con GDD**:
> "IA enemiga mejorada con formaciones tácticas, comunicación por señas, y comportamiento coordinado" - GDD Página 3

Nuestra implementación simplifica la "comunicación" mediante el `StealthSystem` que coordina los estados de todos los enemigos.

---

### 3. Sistema de Visibilidad (Épica 05)

#### Cálculo de Factor de Ocultamiento

```javascript
// StealthSystem.js - línea ~50
calculatePlayerVisibility(player, enemy) {
    let visibility = 1.0; // 100% visible
    
    // Sombras (Épica 05)
    if (this.isPlayerInShadow(player.position)) {
        visibility *= 0.3; // 70% menos visible
    }
    
    // Agachado (Épica 01)
    if (player.isCrouching) {
        visibility *= 0.5;
    }
    
    // Corriendo (hace ruido)
    if (player.isRunning) {
        visibility *= 1.8; // Más detectable
    }
    
    // Distancia
    const distance = BABYLON.Vector3.Distance(player.position, enemy.position);
    visibility *= Math.max(0, 1 - (distance / maxDetectionRange));
    
    return Math.min(1.0, visibility);
}
```

**Conexión con GDD**:
> "Sistema completo de sombras en tiempo real como método de detección" - GDD Página 2

Implementamos esto mediante áreas de sombra que reducen la visibilidad del jugador en un 70%.

---

## 📊 Análisis MDA (Mechanics-Dynamics-Aesthetics)

### Mecánicas (M)

**Implementadas en el código:**
1. Movimiento con 3 velocidades (caminar/correr/agachar)
2. Sistema de detección por visión cónica
3. Áreas de sombra que reducen visibilidad
4. Estados de alerta coordinados

### Dinámicas (D)

**Emergentes del sistema:**
1. **Tensión del Sigilo**: El jugador debe calcular rutas entre sombras
2. **Timing de Patrullaje**: Aprender patrones de movimiento enemigo
3. **Riesgo vs Velocidad**: Correr es más rápido pero más peligroso
4. **Presión Temporal**: En ALERTA hay que esconderse o ser atrapado

### Estética (A)

**Sensaciones objetivo:**
1. 🎭 **Tension of Stealth** (del GDD): Tensión constante de ser descubierto
2. 🧠 **Planificación Táctica**: Sentirse inteligente al resolver el nivel
3. 🏃 **Adrenalina**: Momento de ser detectado y escapar
4. 😎 **Maestría**: Satisfacción al completar sin ser visto

**Conexión con GDD**:
> "El enfoque es elevar la tensión del sigilo como solo el PlayStation 2 puede hacerlo" - GDD Página 1

Logramos esto mediante:
- Feedback visual claro (conos de visión)
- Estados de alerta progresivos
- Consecuencias inmediatas a errores

---

## 🚧 Desafíos Técnicos Resueltos

### 1. Problema: Rotación de Enemigos en Patrullaje

**Desafío**: Los enemigos rotaban instantáneamente hacia el siguiente waypoint (se veía poco natural).

**Solución**:
```javascript
// EnemyAI.js - línea ~230
const targetRotation = Math.atan2(toTarget.x, toTarget.z);
let rotationDiff = targetRotation - currentRotation;

// Normalizar diferencia (-π a π)
while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

// Aplicar gradualmente
this.mesh.rotation.y += rotationDiff * this.rotationSpeed;
```

**Resultado**: Rotación suave y realista, mejorando la estética del juego.

---

### 2. Problema: Cálculo de Sombras en 3D

**Desafío**: Determinar si el jugador está "en sombra" en un mundo 3D sin raytracing completo.

**Solución**: Sistema simplificado de áreas de influencia
```javascript
// StealthSystem.js - línea ~35
isPlayerInShadow(playerPosition) {
    for (let shadow of this.shadowAreas) {
        const distance = BABYLON.Vector3.Distance(playerPosition, shadow.position);
        if (distance < shadow.radius) {
            return true;
        }
    }
    return false;
}
```

**Justificación**: Para un vertical slice, una aproximación esférica es suficiente para validar la mecánica. En el juego final se usaría shadow mapping real.

---

### 3. Problema: Coordinación de Estados entre IA

**Desafío**: Múltiples enemigos deben "comunicarse" cuando detectan al jugador.

**Solución**: Patrón Mediator con `StealthSystem`
```javascript
// StealthSystem.js - línea ~100
updateInfiltration(player, enemies) {
    for (let enemy of enemies) {
        if (canSee && visibility > 0.7) {
            this.setState('ALERT');
            enemy.setState('ALERT'); // Propagar a todos
            return;
        }
    }
}
```

**Conexión con GDD**:
> "IA enemiga mejorada con formaciones tácticas, comunicación por señas" - GDD Página 3

Simplificamos la "comunicación" mediante un sistema centralizado.

---

## 🏭 Patrón de Diseño Factory para Enemigos

### Problema Identificado

Al desarrollar el sistema de enemigos, encontramos que diferentes tipos de enemigos comparten la misma lógica base pero con **configuraciones distintas**:

- **Ninja (Gray Fox)**: Visión corta pero amplia, muy rápido, detecta rápidamente
- **Guard (Guardia estándar)**: Visión media y equilibrada, velocidad normal
- **Sniper (Francotirador)**: Visión larga pero estrecha, estático, detecta muy rápido

Crear enemigos manualmente con todos estos parámetros resultaba en código repetitivo y propenso a errores.

### Solución: Factory Pattern + Builder Pattern

Implementamos el archivo `EnemyFactory.js` que combina dos patrones:

#### 1. Factory Method: Creación Simplificada

```javascript
// EnemyFactory.js
class EnemyFactory {
    static createNinja(scene, position, patrolPoints, id) {
        const config = { ...EnemyPresets.NINJA };
        config.id = id || 'ninja_' + Date.now();
        config.position = position;
        config.patrolPoints = patrolPoints;
        return new EnemyAI(scene, config);
    }
    
    static createGuard(scene, position, patrolPoints, id) {
        const config = { ...EnemyPresets.GUARD };
        // ... configuración
        return new EnemyAI(scene, config);
    }
    
    static createSniper(scene, position, patrolPoints, id) {
        const config = { ...EnemyPresets.SNIPER };
        // ... configuración
        return new EnemyAI(scene, config);
    }
}
```

#### 2. Presets: Configuraciones Predefinidas

```javascript
// EnemyFactory.js
const EnemyPresets = {
    NINJA: {
        viewDistance: 3,      // Visión corta
        viewAngle: 45,        // Ángulo amplio
        patrolSpeed: 0.05,    // Muy rápido
        detectionTime: 3,     // Detecta en 3 segundos
        modelType: 'gray_fox' // Modelo visual
    },
    GUARD: {
        viewDistance: 5,
        viewAngle: 35,
        patrolSpeed: 0.03,
        detectionTime: 5,
        modelType: 'enemy'
    },
    SNIPER: {
        viewDistance: 10,     // Visión larga
        viewAngle: 15,        // Ángulo muy estrecho
        patrolSpeed: 0,       // Estático
        detectionTime: 2,     // Detecta muy rápido
        modelType: 'enemy'
    }
};
```

#### 3. Builder Pattern: Configuración Flexible

```javascript
// EnemyFactory.js
class EnemyBuilder {
    constructor(scene) {
        this.scene = scene;
        this.config = { ...EnemyPresets.GUARD }; // Base por defecto
    }
    
    withVision(distance, angle) {
        this.config.viewDistance = distance;
        this.config.viewAngle = angle;
        return this; // Permite encadenamiento
    }
    
    withSpeed(speed) {
        this.config.patrolSpeed = speed;
        return this;
    }
    
    build() {
        return new EnemyAI(this.scene, this.config);
    }
}

// Uso con método fluido (fluent interface)
const customEnemy = new EnemyBuilder(scene)
    .withVision(8, 60)
    .withSpeed(0.04)
    .withPosition(new BABYLON.Vector3(5, 1, 10))
    .build();
```

### Uso en el Juego

```javascript
// main.js - createEnemies()
createEnemies() {
    // Enemigo 1: NINJA (Gray Fox)
    const enemy1 = EnemyFactory.createNinja(
        this.scene,
        new BABYLON.Vector3(-10, 1, 5),
        patrolPoints1,
        1
    );
    
    // Enemigo 2: GUARD estándar
    const enemy2 = EnemyFactory.createGuard(
        this.scene,
        new BABYLON.Vector3(0, 1, 0),
        patrolPoints2,
        2
    );
    
    this.enemies.push(enemy1, enemy2);
}
```

### Beneficios del Patrón Factory

| Beneficio | Descripción |
|-----------|-------------|
| **Encapsulación** | La lógica de creación está centralizada en un solo lugar |
| **Consistencia** | Los presets garantizan configuraciones válidas y balanceadas |
| **Extensibilidad** | Añadir un nuevo tipo de enemigo solo requiere un nuevo preset |
| **Legibilidad** | `createNinja()` es más claro que configurar 10 parámetros |
| **Mantenibilidad** | Cambiar un tipo de enemigo afecta solo el preset, no todo el código |

### Conexión con GDD

> "El juego contará con aproximadamente 300 enemigos simultáneos" - GDD Página 3

Aunque nuestro vertical slice usa solo 2 enemigos, el patrón Factory permite escalar fácilmente a cientos de enemigos con diferentes configuraciones, cumpliendo con la visión del documento de diseño.

---

## 📈 Métricas de Validación

### ¿Cómo sabemos que el Vertical Slice funciona?

| Criterio | Objetivo | Resultado |
|----------|----------|-----------|
| **Detección funcional** | Enemigos detectan al jugador en su cono | ✅ Implementado con raycast |
| **Sombras afectan gameplay** | Estar en sombra reduce detección | ✅ Reducción de 70% visibilidad |
| **Estados transicionan** | Sistema cambia entre 4 estados | ✅ Lógica completa en StealthSystem |
| **IA patrulla** | Enemigos siguen rutas predefinidas | ✅ Sistema de waypoints |
| **Movimiento táctico** | 3 velocidades + agacharse | ✅ PlayerController completo |

---

## 🔮 Lo que NO se implementó (y por qué)

### Épicas fuera del MVP:

1. ❌ **Épica 04 - Sistema de disparo** 
   - *Razón*: El vertical slice se enfoca en stealth puro
   - *Para el futuro*: Sería la siguiente iteración

2. ❌ **Épica 06 - Gestión de cuerpos**
   - *Razón*: Requiere sistema de ítems y drag-drop complejo
   - *Simplificación*: No hay enemigos que eliminar en este demo

3. ❌ **Épica 07 - Interacción ambiental**
   - *Razón*: Enfoque en movimiento básico primero
   - *Simplificación*: Obstáculos estáticos

4. ❌ **Épicas 08-15** (Fase 2 y 3 del GDD)
   - *Razón*: Fuera del alcance de un vertical slice MVP
   - *Justificación*: El objetivo es validar mecánicas core, no hacer el juego completo

---

## 🎓 Reflexión: GDD vs Implementación

### ¿Qué me sirvió del documento?

1. ✅ **Especificaciones de estados**: Los 4 modos de alerta estaban claramente definidos
2. ✅ **Métricas cuantificables**: "300 enemigos" me dio idea de escala (simplificamos a 2)
3. ✅ **Enfoque en "tension of stealth"**: Guió todas las decisiones de diseño

### ¿Qué tuve que cambiar al programar?

1. 🔄 **Número de enemigos**: GDD dice "300 enemigos simultáneos" → Implementé 2 (más realista para demo)
2. 🔄 **Complejidad de IA**: GDD describe "formaciones tácticas" → Simplifiqué a patrullaje básico
3. 🔄 **Sombras en tiempo real**: GDD habla de "sistema completo" → Usé áreas de influencia simple

### ¿Por qué estos cambios son válidos?

**Un Vertical Slice NO es el juego completo**. Es una prueba de concepto que valida:
- ¿La mecánica es divertida?
- ¿Es técnicamente viable?
- ¿Genera la estética deseada?

Nuestra implementación responde **SÍ** a las tres preguntas, cumpliendo el objetivo del examen.

---

## 📚 Referencias Técnicas

### Patrones de Diseño Utilizados

1. **Factory Pattern**: Implementado en `EnemyFactory.js` para crear diferentes tipos de enemigos (NINJA, GUARD, SNIPER) con configuraciones predefinidas
2. **Builder Pattern**: Clase `EnemyBuilder` permite configuración fluida de enemigos personalizados
3. **State Pattern**: Implementado en `StealthSystem` y `EnemyAI` para manejar estados del juego
4. **Component Pattern**: Separación PlayerController / StealthSystem / EnemyAI
5. **Mediator Pattern**: StealthSystem coordina entre jugador y enemigos

### Bibliotecas y Recursos

- **Babylon.js 6.0**: https://www.babylonjs.com/
- **MDN Web Docs**: Referencia de JavaScript ES6
- **GDD Original**: Metal Gear Solid 2 Grand Game Plan (1999)

---

## 🎬 Conclusión

Este Vertical Slice demuestra que las mecánicas core de MGS2 descritas en el GDD son:

1. ✅ **Técnicamente viables** en una implementación web moderna
2. ✅ **Jugables y divertidas** en un escenario controlado
3. ✅ **Escalables** para expandirse a un juego completo

El prototipo cumple exitosamente con los objetivos del examen:
- Transformar diseño conceptual en realidad técnica
- Demostrar viabilidad a stakeholders
- Validar que la idea genera la experiencia deseada

---

**Equipo de Desarrollo**:
- Said Luna
- Damaris Suquillo

**Curso**: Juegos Interactivos - GR1SW  
**EPN - Noviembre 2025**
