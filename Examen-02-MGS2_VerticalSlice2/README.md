# MGS2 Vertical Slice - Infiltración Táctica

## 🎮 Descripción del Proyecto

Este es un **Vertical Slice** (Prototipo Jugable) basado en el Game Design Document de **Metal Gear Solid 2: Sons of Liberty**. El objetivo es demostrar la viabilidad técnica de las mecánicas core de stealth-action descritas en el documento original.

## 🎯 Objetivo del Vertical Slice

**Demostrar**: Un escenario funcional donde el jugador debe infiltrarse en una sala custodiada por 2 guardias con IA avanzada, utilizando sigilo, sombras y movimiento táctico para llegar a la salida sin ser detectado.

## 🛠️ Tecnologías Utilizadas

- **Babylon.js 6.0**: Motor de renderizado 3D en WebGL
- **JavaScript ES6**: Lógica de juego y sistemas
- **HTML5 Canvas**: Interfaz y radar
- **CSS3**: HUD y elementos visuales

## 📦 Estructura del Proyecto

```
Examen-02-MGS2_VerticalSlice2/
├── index.html              # Página principal con canvas y HUD
├── test_models.html        # Herramienta de prueba para modelos GLB
├── src/
│   ├── main.js             # Inicialización y game loop principal
│   ├── PlayerController.js # Control del jugador (Épica 01)
│   ├── EnemyAI.js          # Inteligencia artificial enemiga (Épica 03)
│   ├── EnemyFactory.js     # 🏭 Patrón Factory para crear tipos de enemigos
│   └── StealthSystem.js    # Sistema de estados de alerta (Épica 02 y 05)
├── assets/
│   ├── models/             # Modelos 3D en formato GLTF/GLB
│   │   ├── metal_gear_solid_the_twin_snakes_solid_snake/  # Jugador
│   │   ├── ninja_gray_fox/  # Enemigo tipo NINJA
│   │   └── enemy.glb        # Enemigo tipo GUARD
│   └── textures/            # Texturas del escenario
│       ├── suelo.jpg        # Textura del piso
│       ├── pared.jpg        # Textura de paredes
│       └── cajas.jpg        # Textura de obstáculos
├── README.md               # Este archivo
├── RESUMEN_EJECUTIVO.md    # Resumen rápido del proyecto
└── ANALISIS_TECNICO.md     # Análisis de implementación + Patrones de Diseño
```

## 🎨 Modelos 3D (Opcional pero Recomendado)

El proyecto está preparado para usar modelos GLB 3D. Si no los tienes, el juego funciona perfectamente con placeholders simples.

### Para añadir modelos:

1. **Ver guía completa**: Abre `GUIA_MODELOS_GLB.md`
2. **Descarga rápida**: Ve a https://quaternius.com/packs.html
3. **Coloca modelos**: En la carpeta `assets/models/`
4. **Prueba**: Abre `test_models.html` para verificar

**⚠️ Importante**: Los modelos son opcionales. El juego funciona 100% sin ellos.

## 🚀 Instrucciones de Ejecución

### Opción 1: Servidor Local Simple

1. Abre una terminal en la carpeta del proyecto
2. Si tienes Python 3 instalado:
   ```bash
   python -m http.server 8000
   ```
3. Abre tu navegador en: `http://localhost:8000`

### Opción 2: Extensión Live Server (VS Code)

1. Instala la extensión "Live Server" en VS Code
2. Click derecho en `index.html`
3. Selecciona "Open with Live Server"

### Opción 3: Directamente en Navegador

1. Simplemente abre `index.html` en tu navegador moderno
2. Algunos navegadores pueden tener restricciones CORS, usa las opciones anteriores si hay problemas

## 🎮 Controles

| Tecla | Acción |
|-------|--------|
| **W, A, S, D** | Movimiento del personaje |
| **SHIFT** | Correr (aumenta detección) |
| **CTRL** | Agacharse (reduce detección) |
| **Mouse** | Rotar cámara |
| **ESC** | Reiniciar nivel |

## 🎯 Cómo Ganar

1. **Infiltrarse** en la sala evitando ser visto
2. **Usar las zonas de sombra** para ocultarte de los enemigos
3. **Observar los conos de visión** de los enemigos (amarillo = seguro)
4. **Llegar a la zona verde** al final de la sala
5. **Puedes ganar en cualquier estado** - incluso en EVASION o ALERT

**Mensajes de victoria según tu estilo:**
- INFILTRATION: "¡Infiltración perfecta!"
- CAUTION: "Has llegado con precaución"
- EVASION: "¡Escapaste justo a tiempo!"
- ALERT: "¡Lo lograste bajo presión!"

## ❌ Cómo Perder

- Ser detectado en modo **ALERTA** y que un guardia te atrape (distancia < 1.5m)

## 🎨 Elementos Visuales

- **Jugador**: Modelo 3D de Solid Snake (Twin Snakes)
- **Enemigos**: 
  - NINJA: Modelo de Gray Fox con visión corta y amplia
  - GUARD: Modelo de guardia con visión equilibrada
- **Zonas de sombra**: Áreas oscuras que ocultan al jugador
- **Objetivo**: Zona verde pulsante (meta)
- **Escenario**: Texturas metálicas en suelo, paredes y cajas
- **Conos de visión dinámicos**:
  - 🟡 Amarillo = Patrullando (normal)
  - 🟠 Naranja = Detectando (timer en progreso)
  - 🔴 Rojo = ¡Detectado! (game over inminente)

## 📊 Estados del Sistema

El juego implementa el sistema de estados de MGS2:

1. **INFILTRACIÓN** (Verde): Normal, enemigos patrullando
2. **ALERTA** (Rojo): ¡Te detectaron! Enemigos persiguen
3. **EVASIÓN** (Naranja): Perdiste línea de vista, enemigos buscan
4. **PRECAUCIÓN** (Amarillo): Enemigos sospechan, buscan activamente

## 🔧 Requisitos del Sistema

- Navegador moderno (Chrome, Firefox, Edge)
- Soporte WebGL 2.0
- Conexión a internet (para cargar Babylon.js desde CDN)

## 🎨 Mejora Visual con Modelos 3D

Este proyecto soporta modelos GLB para personajes. Los modelos son **completamente opcionales** - el juego funciona perfectamente con placeholders (formas simples).

### ¿Quieres añadir modelos?

1. Lee la guía completa: **`GUIA_MODELOS_GLB.md`**
2. Descarga modelos gratuitos de [Quaternius](https://quaternius.com/)
3. Colócalos en `assets/models/` con los nombres:
   - `player.glb` (jugador)
   - `enemy.glb` (enemigo)
4. Verifica que funcionan abriendo: **`test_models.html`**

**Sin modelos**: Verás cápsulas de colores (🔵 jugador, 🔴 enemigos)  
**Con modelos**: Verás personajes 3D completos

Ambas opciones son válidas para el examen.

## 📚 Relación con el GDD

Este vertical slice implementa específicamente:

- ✅ **Épica 01**: Control y movilidad táctica (caminar, correr, agacharse)
- ✅ **Épica 02**: Sistema de stealth y estados de alerta
- ✅ **Épica 03**: IA enemiga con patrullaje y detección coordinada
- ✅ **Épica 05**: Sistema de iluminación y sombras que afecta gameplay

Ver `ANALISIS_TECNICO.md` para detalles sobre decisiones de diseño.

---

## 🏭 Patrones de Diseño Implementados

### Factory Pattern - Creación de Enemigos

El archivo `EnemyFactory.js` implementa el patrón Factory para crear diferentes tipos de enemigos:

| Tipo | Visión | Ángulo | Velocidad | Detección | Modelo |
|------|--------|--------|-----------|-----------|--------|
| **NINJA** | 3m (corta) | 45° (amplia) | 0.05 (rápido) | 3s | Gray Fox |
| **GUARD** | 5m (media) | 35° (media) | 0.03 (normal) | 5s | enemy.glb |
| **SNIPER** | 10m (larga) | 15° (estrecha) | 0 (estático) | 2s | enemy.glb |

```javascript
// Uso simple con Factory
const ninja = EnemyFactory.createNinja(scene, position, patrolPoints, id);
const guard = EnemyFactory.createGuard(scene, position, patrolPoints, id);

// Uso avanzado con Builder
const custom = new EnemyBuilder(scene)
    .withVision(8, 60)
    .withSpeed(0.04)
    .build();
```

### Otros Patrones:
- **State Pattern**: Estados del juego (INFILTRATION, ALERT, EVASION, CAUTION)
- **Mediator Pattern**: StealthSystem coordina jugador y enemigos
- **Component Pattern**: Separación modular de responsabilidades

## 🐛 Problemas Conocidos

- La física de colisión es básica (puede haber pequeños clipping)
- El raycast de visión enemiga puede tener falsos positivos en esquinas
- El radar es una simplificación 2D de las posiciones 3D

## 👥 Equipo de Desarrollo

- **Said Luna**
- **Damaris Suquillo**

**Curso**: Juegos Interactivos - GR1SW  
**Profesor**: MsC. Vicente Eguez  
**Institución**: Escuela Politécnica Nacional  
**Fecha**: Noviembre 2025

## 📝 Notas para el Evaluador

Este proyecto cumple con los requisitos del examen final:

1. ✅ **Enfoque en Mecánicas**: Sistema de stealth funcional con física y colisiones
2. ✅ **Calidad sobre Cantidad**: Un escenario pequeño pero completamente funcional
3. ✅ **Conexión con GDD**: Implementa fielmente las épicas del MVP
4. ✅ **Código limpio**: Arquitectura modular con clases separadas por responsabilidad

---

## 📹 Para el Video de Presentación

### Puntos a cubrir en el video (3-5 minutos):

1. **Demostración del Gameplay** (1-2 min)
   - Mostrar infiltración exitosa
   - Mostrar detección y estados de alerta
   - Mostrar uso de sombras

2. **Explicación Técnica** (1 min)
   - Código del StealthSystem.js (cálculo de visibilidad)
   - Sistema de estados de IA (EnemyAI.js)

3. **Conexión con GDD** (30 seg)
   - Explicar qué épicas se implementaron
   - Mostrar PDF del proyecto original

4. **Reflexión MDA** (30 seg)
   - **Mecánica**: Detección por visión + sombras
   - **Dinámica**: Tensión emergente del sigilo
   - **Estética**: Sensación de ser un agente infiltrado

---

**¡Disfruta el demo!** 🎮
