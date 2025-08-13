# 🎮 TetroCube - Tetris meets 2048

Un juego original que combina las mecánicas de Tetris con el sistema de deslizamiento de 2048 y un innovador sistema de eliminación de rectángulos.

## 🎯 Características del Juego

### ✨ Mecánicas Únicas
- **Piezas de Tetris reales**: 7 piezas clásicas (I, O, T, S, Z, L, J) más bloques simples
- **Movimiento tipo 2048**: Las piezas se desllizan hasta el final del tablero
- **Eliminación de rectángulos**: Los rectángulos sólidos de 4x2+ desaparecen automáticamente
- **Sistema de fragmentación**: Las piezas rotas se convierten en fragmentos independientes

### 🔥 Modo Difícil
- **Grid 8x8**: Espacio limitado para máxima presión
- **Spawn automático**: Nueva pieza cada 8 segundos (se acelera por nivel)
- **Piezas grandes**: 75% de piezas complejas, solo 10% bloques simples
- **Rectángulos 4x2+**: Requiere formaciones más grandes para limpiar

### 🎮 Controles
- **↑ ↓ ← →**: Mover todas las piezas
- **ESPACIO**: Rotar (futuro)
- **P**: Pausar

## 🚀 Cómo Jugar

1. **Objetivo**: Sobrevivir el mayor tiempo posible formando rectángulos para limpiar el tablero
2. **Movimiento**: Usa las flechas para mover TODAS las piezas juntas
3. **Eliminación**: Forma rectángulos sólidos de al menos 4x2 para eliminarlos
4. **Fragmentación**: Cuando una pieza se rompe, los fragmentos se vuelven independientes
5. **Supervivencia**: Evita que el tablero se llene completamente

## 🛠️ Tecnologías

- **HTML5**: Estructura de la aplicación
- **CSS3**: Interfaz dark gaming theme con efectos neon
- **JavaScript ES6**: Lógica del juego con clases modernas
- **Phaser.js 3.70.0**: Engine de juego 2D
- **Canvas**: Renderizado de gráficos

## 📁 Estructura del Proyecto

```
2048_clone/
├── index.html          # Página principal del juego
├── styles.css          # Estilos y tema visual
├── js/
│   └── main.js         # Lógica completa del juego
├── .gitignore          # Archivos excluidos del repositorio
└── README.md           # Documentación del proyecto
```

## 🎯 Algoritmos Implementados

### Detección de Rectángulos
- Búsqueda de áreas rectangulares sólidas
- Algoritmo optimizado para encontrar el rectángulo más grande
- Validación de tamaño mínimo 4x2 o 2x4

### Sistema de Fragmentación
- Búsqueda en profundidad para componentes conectados
- Conversión automática de fragmentos en piezas independientes
- Manejo seguro de errores con recovery

### Movimiento Inteligente
- Ordenamiento de piezas según dirección de movimiento
- Detección de colisiones en tiempo real
- Colocación optimizada para evitar solapamientos

## 🏆 Scoring System

- **100 puntos** por celda eliminada × nivel actual
- **Nivel up** cada 5 rectángulos eliminados
- **Auto-spawn** se acelera con cada nivel (8s → 4s mínimo)

## 🎨 Visual Features

- **Tema oscuro gaming** con acentos neón
- **Colores únicos** para cada tipo de pieza
- **Efectos de partículas** al eliminar rectángulos
- **Grid responsive** que se adapta al tamaño

## 🔧 Desarrollo

Para ejecutar localmente:
1. Clona el repositorio
2. Abre `index.html` en un navegador moderno
3. ¡Disfruta del juego!

No requiere instalación de dependencias - funciona directamente en el navegador.

---

**¡Que disfrutes jugando TetroCube!** 🎮✨
