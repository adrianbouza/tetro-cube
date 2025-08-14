// TetroCube Game - 6x6 Grid with Movable Tetris Pieces
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }
    
    init() {
        // Game state
        this.gridWidth = 7;
        this.gridHeight = 7;
        this.cellSize = 60; // Adjusted for 7x7 grid
        this.grid = [];
        this.pieces = []; // Array to store active pieces with their positions
        this.nextPieceId = 1; // ID counter for pieces
        this.gameState = 'waiting'; // waiting, playing, paused, gameOver
        this.score = 20; // Start with 20 points
        this.level = 1;
        this.linesCleared = 0;
        
        // Piece selection system
        this.selectedPiece = null; // Currently selected piece
        this.isIndividualMode = false; // True when a piece is selected
        this.tempPosition = null; // Temporary position before confirmation
        this.isMovingPiece = false; // True when piece is in temporary move state
        
        // Animation blocking system
        this.isAnimationPlaying = false; // Block all actions during animations
        
        // Next pieces system
        this.nextPieces = []; // Array of next 2 pieces
        
        // UI elements
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.linesElement = document.getElementById('lines');
        this.modal = document.getElementById('game-over-modal');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalLevelElement = document.getElementById('final-level');
        
        // Simplified 4-color system for better gameplay
        this.pieceTemplates = {
            I: { shape: [[1,1,1,1]], color: 0xff0000, textColor: 0xffffff }, // Rojo - Color 1
            O: { shape: [[1,1],[1,1]], color: 0x0000ff, textColor: 0xffffff }, // Azul - Color 2
            T: { shape: [[0,1,0],[1,1,1]], color: 0x00ff00, textColor: 0x000000 }, // Verde - Color 3
            S: { shape: [[0,1,1],[1,1,0]], color: 0xffff00, textColor: 0x000000 }, // Amarillo - Color 4
            Z: { shape: [[1,1,0],[0,1,1]], color: 0xff0000, textColor: 0xffffff }, // Rojo - Color 1 (same as I)
            L: { shape: [[1,0,0],[1,1,1]], color: 0x0000ff, textColor: 0xffffff }, // Azul - Color 2 (same as O)
            J: { shape: [[0,0,1],[1,1,1]], color: 0x00ff00, textColor: 0x000000 }, // Verde - Color 3 (same as T)
            // Additional pieces for 7x7 grid - use the 4 colors
            I3: { shape: [[1,1,1]], color: 0xffff00, textColor: 0x000000 }, // Amarillo - Color 4 (same as S)
            L2: { shape: [[1,0],[1,1]], color: 0xff0000, textColor: 0xffffff }, // Rojo - Color 1
            // Single blocks for easier gameplay
            SINGLE: { shape: [[1]], color: 0x0000ff, textColor: 0xffffff } // Azul - Color 2
        };
        
        this.pieceTypes = Object.keys(this.pieceTemplates);
        
        this.initializeGrid();
    }
    
    initializeGrid() {
        this.grid = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(0));
    }
    
    preload() {
        // Phaser preload method - no graphics creation here
        // Graphics will be created in the create() method
    }
    
    create() {
        // Initialize game state
        this.init();
        
        // Create 2048-style tiles for tetris blocks
        Object.entries(this.pieceTemplates).forEach(([type, piece]) => {
            this.create2048StyleTile(type, piece.color, piece.textColor);
        });
        
        // Create fragment tile textures for each color
        const colors = [
            { color: 0xff0000, textColor: 0xffffff }, // Rojo
            { color: 0x0000ff, textColor: 0xffffff }, // Azul  
            { color: 0x00ff00, textColor: 0x000000 }, // Verde
            { color: 0xffff00, textColor: 0x000000 }  // Amarillo
        ];
        
        colors.forEach(colorData => {
            this.create2048StyleTile(`FRAGMENT_${colorData.color.toString(16)}`, colorData.color, colorData.textColor, 'FRAG');
        });
        
        // Create fallback generic fragment tile texture
        this.create2048StyleTile('FRAGMENT', this.pieceTemplates.SINGLE.color, this.pieceTemplates.SINGLE.textColor, 'FRAG');
        
        // Create empty grid cell texture with 2048 style
        this.add.graphics()
            .fillStyle(0xcdc1b4) // 2048 empty cell color
            .fillRoundedRect(2, 2, this.cellSize - 4, this.cellSize - 4, 3) // Rounded corners with margin
            .generateTexture('empty_cell', this.cellSize, this.cellSize);
        
        // Create grid visual
        this.gridGraphics = this.add.group();
        this.createGridVisual();
        
        // Create current piece group (not used but kept for compatibility)
        this.currentPieceGroup = this.add.group();
        
        // Input handling
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-SPACE', this.spawnNewPiece.bind(this));
        
        // Add click handling for piece selection
        this.input.on('pointerdown', this.handleGridClick.bind(this));
        
        // Add mobile touch controls
        this.createMobileControls();
        
        // Render the grid initially
        this.renderGrid();
        
        // Start the game
        this.gameState = 'playing';
        
        // Update score display
        this.updateScoreDisplay();
        
        // Show initial instructions
        this.showMessage('Presiona ESPACIO para generar pieza. Las fusiones ocurren al perder focus.');
        
        // Don't spawn test pieces automatically - start with empty board
        // Players can use SPACE to spawn pieces or testScenario() functions
        
        // Make merge function available globally for debugging
        window.testMerge = () => {
            console.log('🔧 Testing merge from console!');
            this.checkAndMergeSameColorPieces();
        };
        
        // Add function to spawn different test scenarios
        window.testScenario = (scenario) => {
            this.pieces = []; // Clear existing pieces
            this.initializeGrid();
            
            if (scenario === 1) {
                // Test 1: Two adjacent SINGLE pieces
                this.spawnTestPieces();
            } else if (scenario === 2) {
                // Test 2: Three pieces in a line
                this.spawnThreePiecesInLine();
            } else if (scenario === 3) {
                // Test 3: L-shaped configuration
                this.spawnLShapedPieces();
            } else if (scenario === 4) {
                // Test 4: Square of 4 pieces
                this.spawnSquareOfPieces();
            }
            
            this.renderGrid();
        };
        
        window.gameScene = this; // Make the whole game scene available for debugging
    }
    
    create2048StyleTile(type, color, textColor, customText = null) {
        const graphics = this.add.graphics();
        
        // Create rounded rectangle with shadow effect
        graphics.fillStyle(0x000000, 0.1); // Shadow
        graphics.fillRoundedRect(4, 4, this.cellSize - 4, this.cellSize - 4, 3);
        
        graphics.fillStyle(color); // Main color
        graphics.fillRoundedRect(2, 2, this.cellSize - 4, this.cellSize - 4, 3);
        
        // Add text label
        const style = {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: `#${textColor.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold'
        };
        
        const displayText = customText || type;
        const text = this.add.text(this.cellSize / 2, this.cellSize / 2, displayText, style);
        text.setOrigin(0.5, 0.5);
        
        graphics.generateTexture(`tile_${type}`, this.cellSize, this.cellSize);
        
        // Clean up temporary objects
        graphics.destroy();
        text.destroy();
    }
    
    createGridVisual() {
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const x = col * this.cellSize + this.cellSize / 2;
                const y = row * this.cellSize + this.cellSize / 2;
                const cell = this.add.image(x, y, 'empty_cell');
                cell.setData('row', row);
                cell.setData('col', col);
                
                // Make cells interactive for clicking
                cell.setInteractive();
                cell.on('pointerdown', (pointer, localX, localY, event) => {
                    this.handleCellClick(row, col);
                    event.stopPropagation();
                });
                
                this.gridGraphics.add(cell);
            }
        }
    }
    
    handleGridClick(pointer) {
        // Click on empty area - deselect current piece
        this.deselectPiece();
    }
    
    handleCellClick(row, col) {
        // Block selection during animations
        if (this.isAnimationPlaying) {
            this.showMessage('Espera a que termine la animación');
            return;
        }
        
        console.log(`Cell clicked: (${row}, ${col})`);
        
        // Find piece at this position
        const pieceId = this.grid[row][col];
        if (pieceId) {
            const piece = this.pieces.find(p => p.id === pieceId);
            if (piece) {
                this.selectPiece(piece);
                console.log(`Selected piece ${piece.type} with ID ${piece.id}`);
            }
        } else {
            // Clicked on empty cell - deselect
            this.deselectPiece();
        }
    }
    
    selectPiece(piece) {
        // Clear any existing highlights first
        this.clearSelectionHighlights();
        
        this.selectedPiece = piece;
        this.isIndividualMode = true;
        this.highlightSelectedPiece();
        console.log(`Selected piece ${piece.type}(${piece.id}) - Use arrow keys to move, R to rotate, ESC to deselect`);
        this.showMessage(`Pieza ${piece.type} seleccionada`);
    }
    
    deselectPiece() {
        if (this.selectedPiece) {
            console.log(`Deselecting piece ${this.selectedPiece.type}(${this.selectedPiece.id}) - checking for merges and lines on focus loss`);
            
            this.selectedPiece = null;
            this.isIndividualMode = false;
            this.clearSelectionHighlights(); // Clear selection borders
            this.showMessage('Validando fusiones y líneas...');
            console.log('No piece selected - Click on a piece to select it');
            
            // Check for merges and lines when focus is lost
            this.checkAndMergeSameColorPieces();
        }
    }
    
    highlightSelectedPiece() {
        // Clear any existing selection highlights
        this.clearSelectionHighlights();
        
        if (!this.selectedPiece) return;
        
        // Create border highlights for the selected piece
        const pieceCells = this.getPieceCells(this.selectedPiece);
        
        pieceCells.forEach(cell => {
            if (cell.row >= 0 && cell.row < this.gridHeight && 
                cell.col >= 0 && cell.col < this.gridWidth) {
                
                // Create a border rectangle for each cell of the selected piece
                const x = cell.col * this.cellSize;
                const y = cell.row * this.cellSize;
                
                // Use yellow border for selected piece
                const borderColor = 0xffff00; // Yellow for selected
                const borderWidth = 4;
                
                const border = this.add.rectangle(x + this.cellSize/2, y + this.cellSize/2, 
                    this.cellSize - 2, this.cellSize - 2);
                border.setStrokeStyle(borderWidth, borderColor);
                border.setFillStyle(0x000000, 0); // Transparent fill
                
                // Add pulsing effect to the border
                this.tweens.add({
                    targets: border,
                    alpha: 0.3,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
                
                // Store reference for cleanup
                if (!this.selectionBorders) this.selectionBorders = [];
                this.selectionBorders.push(border);
            }
        });
    }
    
    clearSelectionHighlights() {
        // Clear existing selection borders and their tweens
        if (this.selectionBorders) {
            this.selectionBorders.forEach(border => {
                if (border && border.destroy) {
                    // Stop tweens for this specific border
                    this.tweens.killTweensOf(border);
                    border.destroy();
                }
            });
            this.selectionBorders = [];
        }
    }
    
    showMessage(text) {
        // Create a temporary message display
        if (this.messageText) {
            this.messageText.destroy();
        }
        
        this.messageText = this.add.text(this.gridWidth * this.cellSize / 2, 20, text, {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        this.messageText.setOrigin(0.5, 0.5);
        
        // Make message disappear after 2 seconds
        this.time.delayedCall(2000, () => {
            if (this.messageText) {
                this.messageText.destroy();
                this.messageText = null;
            }
        });
    }
    
    createMobileControls() {
        // Check if device is mobile/tablet
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         window.innerWidth <= 768;
        
        if (!isMobile) return; // Only show controls on mobile devices
        
        // Control panel dimensions and position
        const controlPanelY = this.gridHeight * this.cellSize + 20;
        const buttonSize = 50;
        const buttonSpacing = 60;
        const centerX = (this.gridWidth * this.cellSize) / 2;
        
        // Create control panel background
        const controlBg = this.add.rectangle(centerX, controlPanelY + 80, 
            this.gridWidth * this.cellSize, 160, 0x000000, 0.7);
        
        // Movement buttons (D-pad style)
        const upButton = this.add.rectangle(centerX, controlPanelY, buttonSize, buttonSize, 0x4a4a4a)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive()
            .on('pointerdown', () => this.handleMobileButtonPress(upButton, () => this.handleMobileMove(0, -1)))
            .on('pointerup', () => this.handleMobileButtonRelease(upButton))
            .on('pointerout', () => this.handleMobileButtonRelease(upButton));
        
        const downButton = this.add.rectangle(centerX, controlPanelY + buttonSpacing * 2, buttonSize, buttonSize, 0x4a4a4a)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive()
            .on('pointerdown', () => this.handleMobileButtonPress(downButton, () => this.handleMobileMove(0, 1)))
            .on('pointerup', () => this.handleMobileButtonRelease(downButton))
            .on('pointerout', () => this.handleMobileButtonRelease(downButton));
        
        const leftButton = this.add.rectangle(centerX - buttonSpacing, controlPanelY + buttonSpacing, buttonSize, buttonSize, 0x4a4a4a)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive()
            .on('pointerdown', () => this.handleMobileButtonPress(leftButton, () => this.handleMobileMove(-1, 0)))
            .on('pointerup', () => this.handleMobileButtonRelease(leftButton))
            .on('pointerout', () => this.handleMobileButtonRelease(leftButton));
        
        const rightButton = this.add.rectangle(centerX + buttonSpacing, controlPanelY + buttonSpacing, buttonSize, buttonSize, 0x4a4a4a)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive()
            .on('pointerdown', () => this.handleMobileButtonPress(rightButton, () => this.handleMobileMove(1, 0)))
            .on('pointerup', () => this.handleMobileButtonRelease(rightButton))
            .on('pointerout', () => this.handleMobileButtonRelease(rightButton));
        
        // Action buttons
        const rotateButton = this.add.rectangle(centerX + buttonSpacing * 2.5, controlPanelY + buttonSpacing, buttonSize, buttonSize, 0x2e7d32)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive()
            .on('pointerdown', () => this.handleMobileButtonPress(rotateButton, () => this.handleMobileRotate()))
            .on('pointerup', () => this.handleMobileButtonRelease(rotateButton))
            .on('pointerout', () => this.handleMobileButtonRelease(rotateButton));
        
        const confirmButton = this.add.rectangle(centerX - buttonSpacing * 2.5, controlPanelY, buttonSize, buttonSize, 0x1976d2)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive()
            .on('pointerdown', () => this.handleMobileButtonPress(confirmButton, () => this.handleMobileConfirm()))
            .on('pointerup', () => this.handleMobileButtonRelease(confirmButton))
            .on('pointerout', () => this.handleMobileButtonRelease(confirmButton));
        
        const cancelButton = this.add.rectangle(centerX - buttonSpacing * 2.5, controlPanelY + buttonSpacing * 2, buttonSize, buttonSize, 0xd32f2f)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive()
            .on('pointerdown', () => this.handleMobileButtonPress(cancelButton, () => this.handleMobileCancel()))
            .on('pointerup', () => this.handleMobileButtonRelease(cancelButton))
            .on('pointerout', () => this.handleMobileButtonRelease(cancelButton));
        
        const spawnButton = this.add.rectangle(centerX + buttonSpacing * 2.5, controlPanelY, buttonSize, buttonSize, 0x7b1fa2)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive()
            .on('pointerdown', () => this.handleMobileButtonPress(spawnButton, () => this.spawnNewPiece()))
            .on('pointerup', () => this.handleMobileButtonRelease(spawnButton))
            .on('pointerout', () => this.handleMobileButtonRelease(spawnButton));
        
        // Button labels
        this.add.text(centerX, controlPanelY, '↑', { fontSize: '24px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(centerX, controlPanelY + buttonSpacing * 2, '↓', { fontSize: '24px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(centerX - buttonSpacing, controlPanelY + buttonSpacing, '←', { fontSize: '24px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(centerX + buttonSpacing, controlPanelY + buttonSpacing, '→', { fontSize: '24px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        
        this.add.text(centerX + buttonSpacing * 2.5, controlPanelY + buttonSpacing, 'R', { fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(centerX - buttonSpacing * 2.5, controlPanelY, '✓', { fontSize: '20px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(centerX - buttonSpacing * 2.5, controlPanelY + buttonSpacing * 2, '✗', { fontSize: '20px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(centerX + buttonSpacing * 2.5, controlPanelY, '+', { fontSize: '24px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        
        // Label descriptions
        this.add.text(centerX - buttonSpacing * 2.5, controlPanelY - 25, 'DESELECCIONAR', { fontSize: '10px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(centerX - buttonSpacing * 2.5, controlPanelY + buttonSpacing * 2 + 25, 'DESELECCIONAR', { fontSize: '10px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(centerX + buttonSpacing * 2.5, controlPanelY + buttonSpacing + 25, 'ROTAR (-1 PT)', { fontSize: '10px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(centerX + buttonSpacing * 2.5, controlPanelY - 25, 'NUEVA PIEZA', { fontSize: '10px', fontFamily: 'Arial', color: '#ffffff' }).setOrigin(0.5);
        
        // Add swipe gesture support
        this.setupSwipeGestures();
    }
    
    setupSwipeGestures() {
        let startX, startY, startTime;
        const minSwipeDistance = 50;
        const maxSwipeTime = 500; // Max time for a swipe gesture
        
        this.input.on('pointerdown', (pointer) => {
            // Only track swipes that start on the game grid area
            if (pointer.y < this.gridHeight * this.cellSize) {
                startX = pointer.x;
                startY = pointer.y;
                startTime = Date.now();
            }
        });
        
        this.input.on('pointerup', (pointer) => {
            if (!startX || !startY || !startTime) return;
            
            const deltaX = pointer.x - startX;
            const deltaY = pointer.y - startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const timeElapsed = Date.now() - startTime;
            
            // Reset tracking variables
            startX = null;
            startY = null;
            startTime = null;
            
            // Check if this qualifies as a swipe gesture
            if (distance < minSwipeDistance || timeElapsed > maxSwipeTime) return;
            
            // Only process swipe if a piece is selected
            if (!this.selectedPiece) {
                this.showMessage('Selecciona una pieza primero');
                return;
            }
            
            // Determine swipe direction
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 0) {
                    this.handleMobileMove(1, 0); // Right
                } else {
                    this.handleMobileMove(-1, 0); // Left
                }
            } else {
                // Vertical swipe
                if (deltaY > 0) {
                    this.handleMobileMove(0, 1); // Down
                } else {
                    this.handleMobileMove(0, -1); // Up
                }
            }
        });
    }
    
    handleMobileButtonPress(button, action) {
        // Visual feedback for button press
        button.setScale(0.9);
        button.setAlpha(0.8);
        
        // Execute the action
        action();
        
        // Add vibration feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    handleMobileButtonRelease(button) {
        // Reset button appearance
        button.setScale(1.0);
        button.setAlpha(1.0);
    }
    
    handleMobileMove(deltaX, deltaY) {
        if (this.selectedPiece) {
            console.log(`Mobile move: deltaX=${deltaX}, deltaY=${deltaY}`);
            this.moveSelectedPieceOneCell(deltaX, deltaY);
        } else {
            console.log('No piece selected for mobile move');
            this.showMessage('Selecciona una pieza primero');
        }
    }
    
    handleMobileRotate() {
        if (this.selectedPiece) {
            console.log('Mobile rotate triggered');
            this.rotateSelectedPiece();
        } else {
            console.log('No piece selected for mobile rotate');
            this.showMessage('Selecciona una pieza primero');
        }
    }
    
    handleMobileConfirm() {
        // Removed - no longer needed since movements are immediate
        console.log('Confirm button pressed - no action needed with immediate movement system');
        this.showMessage('Los movimientos son inmediatos');
    }
    
    handleMobileCancel() {
        // Only deselect piece now
        console.log('Cancel/Deselect button pressed');
        this.deselectPiece();
    }
    
    updateScoreDisplay() {
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score;
        }
        if (this.levelElement) {
            this.levelElement.textContent = this.level;
        }
        if (this.linesElement) {
            this.linesElement.textContent = this.linesCleared;
        }
        
        // Check for game over due to score
        if (this.score <= 0) {
            console.log('Game Over - Score reached 0 or below');
            this.gameOver();
        }
    }
    
    addScore(points, reason = '') {
        this.score += points;
        console.log(`Score ${points > 0 ? '+' : ''}${points} (${reason}): ${this.score}`);
        this.updateScoreDisplay();
        
        if (points > 0) {
            this.showMessage(`+${points} puntos (${reason})`);
        } else {
            this.showMessage(`${points} punto (${reason})`);
        }
    }
    
    update(time, delta) {
        if (this.gameState !== 'playing') return;
        
        this.handleInput();
        
        // Auto-spawn system removed - pieces now spawn only when user presses SPACE
    }
    
    // Add new method to spawn pieces manually
    spawnNewPiece() {
        // Block spawning during animations
        if (this.isAnimationPlaying) {
            this.showMessage('Espera a que termine la animación');
            return;
        }
        
        console.log('Space pressed - first checking lines, then spawning new piece');
        const wasSelected = this.selectedPiece !== null;
        
        // If there was a selected piece, deselect it first
        if (wasSelected) {
            console.log('Deselecting piece before line check');
            this.selectedPiece = null;
            this.isIndividualMode = false;
            this.clearSelectionHighlights();
        }
        
        // First: Always check for lines and merges
        console.log('Step 1: Checking for lines and merges...');
        this.showMessage('Verificando líneas completas...');
        
        // Block actions during the entire sequence
        this.isAnimationPlaying = true;
        
        // Check for completed lines first
        const hasCompletedLines = this.hasCompletedLines();
        
        if (hasCompletedLines) {
            console.log('Lines found - clearing them before spawning new piece');
            this.checkAndClearRectangles(() => {
                // After line animation completes, check for merges
                console.log('Step 2: Checking for merges after line clearing...');
                this.checkAndMergeSameColorPieces(() => {
                    // After all animations complete, spawn new piece
                    console.log('Step 3: Spawning new piece after all animations complete');
                    this.spawnNewPieceAfterAnimations();
                });
            });
        } else {
            // No lines to clear, but still check for merges
            console.log('No lines found - checking for merges only');
            this.checkAndMergeSameColorPieces(() => {
                // After merge animations complete, spawn new piece
                console.log('Step 2: Spawning new piece after merge check');
                this.spawnNewPieceAfterAnimations();
            });
        }
    }
    
    spawnNewPieceAfterAnimations() {
        console.log('All animations complete - spawning new piece now');
        this.spawnNextPieceRandomly();
        this.isAnimationPlaying = false; // Unblock actions
        this.showMessage('Nueva pieza añadida');
    }
    
    checkAndSpawnNewPieces() {
        // Only spawn if we have less than a reasonable number of pieces on the board
        const maxPiecesOnBoard = 6; // Reduced for better gameplay balance
        
        if (this.pieces.length < maxPiecesOnBoard) {
            // Check if there's enough empty space to spawn a new piece
            const emptySpaces = this.countEmptySpaces();
            const gridSize = this.gridWidth * this.gridHeight;
            const occupiedPercentage = (gridSize - emptySpaces) / gridSize;
            
            // Only spawn if less than 60% of the board is occupied (more conservative)
            if (occupiedPercentage < 0.6) {
                // Initialize spawn timer if it doesn't exist
                if (!this.lastSpawnTime) {
                    this.lastSpawnTime = 0;
                }
                
                const currentTime = this.time.now;
                const spawnInterval = 4000; // 4 seconds between auto-spawns (slightly longer)
                
                if (currentTime - this.lastSpawnTime > spawnInterval) {
                    console.log('Auto-spawning new piece...');
                    this.spawnNextPieceRandomly();
                    this.lastSpawnTime = currentTime;
                }
            }
        }
    }
    
    countEmptySpaces() {
        let emptyCount = 0;
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCount++;
                }
            }
        }
        return emptyCount;
    }
    
    handleInput() {
        // Block all input during animations
        if (this.isAnimationPlaying) {
            return;
        }
        
        // New rule: Always require a piece to be selected before moving
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            if (this.selectedPiece) {
                console.log('Left arrow pressed, moving selected piece left by 1 cell');
                this.moveSelectedPieceOneCell(-1, 0);
            } else {
                console.log('No piece selected! Click on a piece first.');
                this.showMessage('Selecciona una pieza primero');
            }
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            if (this.selectedPiece) {
                console.log('Right arrow pressed, moving selected piece right by 1 cell');
                this.moveSelectedPieceOneCell(1, 0);
            } else {
                console.log('No piece selected! Click on a piece first.');
                this.showMessage('Selecciona una pieza primero');
            }
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            if (this.selectedPiece) {
                console.log('Down arrow pressed, moving selected piece down by 1 cell');
                this.moveSelectedPieceOneCell(0, 1);
            } else {
                console.log('No piece selected! Click on a piece first.');
                this.showMessage('Selecciona una pieza primero');
            }
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            if (this.selectedPiece) {
                console.log('Up arrow pressed, moving selected piece up by 1 cell');
                this.moveSelectedPieceOneCell(0, -1);
            } else {
                console.log('No piece selected! Click on a piece first.');
                this.showMessage('Selecciona una pieza primero');
            }
        }
        
        // R key to rotate selected piece
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('R'))) {
            if (this.selectedPiece) {
                console.log('R key pressed, rotating selected piece');
                this.rotateSelectedPiece();
            } else {
                console.log('No piece selected! Click on a piece first.');
                this.showMessage('Selecciona una pieza primero');
            }
        }
        
        // ESC key to deselect piece
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('ESC'))) {
            this.deselectPiece();
        }
        
        // M key to manually test merging
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('M'))) {
            console.log('🔧 Manual merge test triggered!');
            this.checkAndMergeSameColorPieces();
        }
    }
    
    // DEPRECATED: Group movement no longer used in new rule system
    // moveAllPieces() method removed - now only individual piece movement allowed
    
    moveSelectedPieceOneCell(deltaX, deltaY) {
        if (!this.selectedPiece) return;
        
        // Block movement during animations
        if (this.isAnimationPlaying) {
            this.showMessage('Espera a que termine la animación');
            return;
        }
        
        console.log(`Moving selected piece ${this.selectedPiece.id} by deltaX: ${deltaX}, deltaY: ${deltaY} (one cell)`);
        
        // Remove piece from current position
        this.removePieceFromGrid(this.selectedPiece);
        
        const currentX = this.selectedPiece.x;
        const currentY = this.selectedPiece.y;
        
        // Try to move exactly one cell in the specified direction
        const newX = currentX + deltaX;
        const newY = currentY + deltaY;
        
        // Check if the new position is valid
        if (this.canPlacePieceAt(this.selectedPiece, newX, newY)) {
            // Move successful - immediately consume 1 point
            this.selectedPiece.x = newX;
            this.selectedPiece.y = newY;
            this.placePieceOnGrid(this.selectedPiece);
            
            // Consume 1 point for the movement
            this.addScore(-1, 'movimiento');
            
            console.log(`Moved selected piece ${this.selectedPiece.id} from (${currentX}, ${currentY}) to (${newX}, ${newY})`);
            
            // Update highlighting for new position
            this.highlightSelectedPiece();
            
            // Re-render grid (merge check happens only when focus is lost)
            this.renderGrid();
            
        } else {
            // Move failed - put piece back, no point cost for invalid moves
            this.placePieceOnGrid(this.selectedPiece);
            console.log(`Cannot move piece ${this.selectedPiece.id} to (${newX}, ${newY}) - position blocked or out of bounds`);
            this.showMessage('Movimiento bloqueado - sin costo');
        }
    }
    
    clearPieceFromGrid(piece) {
        if (piece.type === 'FRAGMENT') {
            // For fragment pieces, use stored cell positions
            piece.cells.forEach(relativeCell => {
                const gridY = piece.y + relativeCell.row;
                const gridX = piece.x + relativeCell.col;
                if (gridY >= 0 && gridY < this.gridHeight && 
                    gridX >= 0 && gridX < this.gridWidth) {
                    this.grid[gridY][gridX] = 0;
                }
            });
        } else {
            // For regular pieces, use the correct shape (rotated or original)
            const shape = this.getPieceShape(piece);
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const gridY = piece.y + row;
                        const gridX = piece.x + col;
                        if (gridY >= 0 && gridY < this.gridHeight && 
                            gridX >= 0 && gridX < this.gridWidth) {
                            this.grid[gridY][gridX] = 0;
                        }
                    }
                }
            }
        }
    }
    
    removePieceFromGrid(piece) {
        if (piece.type === 'FRAGMENT') {
            // For fragment pieces, use stored cell positions
            piece.cells.forEach(relativeCell => {
                const gridY = piece.y + relativeCell.row;
                const gridX = piece.x + relativeCell.col;
                if (gridY >= 0 && gridY < this.gridHeight && 
                    gridX >= 0 && gridX < this.gridWidth) {
                    if (this.grid[gridY][gridX] === piece.id) {
                        this.grid[gridY][gridX] = 0;
                    }
                }
            });
        } else {
            // For regular pieces, use the correct shape (rotated or original)
            const shape = this.getPieceShape(piece);
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const gridY = piece.y + row;
                        const gridX = piece.x + col;
                        if (gridY >= 0 && gridY < this.gridHeight && 
                            gridX >= 0 && gridX < this.gridWidth) {
                            if (this.grid[gridY][gridX] === piece.id) {
                                this.grid[gridY][gridX] = 0;
                            }
                        }
                    }
                }
            }
        }
    }

    placePieceOnGrid(piece) {
        if (piece.type === 'FRAGMENT') {
            // For fragment pieces, use stored cell positions
            piece.cells.forEach(relativeCell => {
                const gridY = piece.y + relativeCell.row;
                const gridX = piece.x + relativeCell.col;
                if (gridY >= 0 && gridY < this.gridHeight && 
                    gridX >= 0 && gridX < this.gridWidth) {
                    this.grid[gridY][gridX] = piece.id;
                }
            });
        } else {
            // For regular pieces, use the correct shape (rotated or original)
            const shape = this.getPieceShape(piece);
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const gridY = piece.y + row;
                        const gridX = piece.x + col;
                        if (gridY >= 0 && gridY < this.gridHeight && 
                            gridX >= 0 && gridX < this.gridWidth) {
                            this.grid[gridY][gridX] = piece.id;
                        }
                    }
                }
            }
        }
    }
    
    canPlacePieceAt(piece, x, y) {
        if (piece.type === 'FRAGMENT') {
            // For fragment pieces, check stored cell positions
            for (let relativeCell of piece.cells) {
                const gridY = y + relativeCell.row;
                const gridX = x + relativeCell.col;
                
                // Check bounds
                if (gridY < 0 || gridY >= this.gridHeight || 
                    gridX < 0 || gridX >= this.gridWidth) {
                    return false;
                }
                
                // Check for collision with other pieces
                if (this.grid[gridY][gridX] !== 0) {
                    return false;
                }
            }
        } else {
            // For regular pieces, use the correct shape (rotated or original)
            const shape = this.getPieceShape(piece);
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const gridY = y + row;
                        const gridX = x + col;
                        
                        // Check bounds
                        if (gridY < 0 || gridY >= this.gridHeight || 
                            gridX < 0 || gridX >= this.gridWidth) {
                            return false;
                        }
                        
                        // Check for collision with other pieces
                        if (this.grid[gridY][gridX] !== 0) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    
    checkAndMergeSameColorPieces(onComplete = null) {
        console.log('=== Checking for same color piece merging ===');
        console.log(`Current pieces before merging: ${this.pieces.length}`);
        this.pieces.forEach(p => console.log(`  - ${p.type}(${p.id}) at (${p.x},${p.y}) color:${p.color.toString(16)}`));
        
        // Check if there are any groups to merge before starting animations
        const initialMergeGroups = this.findMergeGroups();
        if (initialMergeGroups.length > 0) {
            // Block actions during the entire merge sequence
            this.isAnimationPlaying = true;
            // Process merges one group at a time with animation
            this.processMergeGroups(onComplete);
        } else {
            // No merges to do, but still check for lines
            console.log('No merges found, checking for complete lines...');
            this.checkAndClearRectangles(false, onComplete);
        }
    }
    
    processMergeGroups(onComplete = null) {
        const mergeGroups = this.findMergeGroups();
        
        if (mergeGroups.length === 0) {
            // No more merges possible - finish and unblock actions
            console.log(`✅ Merging complete. Final pieces: ${this.pieces.length}`);
            this.pieces.forEach(p => console.log(`  - ${p.type}(${p.id}) at (${p.x},${p.y}) color:${p.color.toString(16)}`));
            
            // Unblock actions when all merges are complete
            this.isAnimationPlaying = false;
            
            // Check for completed lines after all merges are done
            this.checkAndClearRectangles(false, onComplete);
            
            console.log('=== End piece merging check ===');
            return;
        }
        
        console.log(`Found ${mergeGroups.length} merge groups`);
        
        // Process the first merge group with animation
        const group = mergeGroups[0];
        console.log(`🔥 MERGING group: ${group.length} pieces of color ${group[0].color.toString(16)}`);
        group.forEach(p => console.log(`   - ${p.type}(${p.id}) at (${p.x},${p.y})`));
        
        // Count total cells before merging
        let totalCellsBeforeMerge = 0;
        group.forEach(piece => {
            const cells = this.getPieceCells(piece);
            totalCellsBeforeMerge += cells.length;
        });
        
        // Create merge animation before removing pieces
        this.animateMerge(group, () => {
            // Add haptic feedback for merge
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]); // Pattern for merge vibration
            }
            
            // Remove original pieces from grid
            group.forEach(piece => {
                this.removePieceFromGrid(piece);
            });
            
            // Remove original pieces from pieces array
            group.forEach(piece => {
                const index = this.pieces.findIndex(p => p.id === piece.id);
                if (index !== -1) {
                    this.pieces.splice(index, 1);
                }
            });
            
            // Create merged piece
            const mergedPiece = this.createMergedPiece(group);
            
            // Create texture for this specific fragment color if it doesn't exist
            this.ensureFragmentTextureExists(mergedPiece.color);
            
            this.pieces.push(mergedPiece);
            this.placePieceOnGrid(mergedPiece);
            
            // Calculate cells eliminated in merging process
            const cellsAfterMerge = mergedPiece.cells.length;
            const cellsEliminated = totalCellsBeforeMerge - cellsAfterMerge;
            
            // Add score for eliminated cells (overlapping cells that were removed)
            if (cellsEliminated > 0) {
                this.addScore(cellsEliminated * 1, `${cellsEliminated} celdas fusionadas`);
            }
            
            console.log(`✅ Created merged piece ${mergedPiece.id} with ${mergedPiece.cells.length} cells (eliminated ${cellsEliminated} overlapping cells)`);
            
            // Re-render grid after merge
            this.renderGrid();
            
            // Continue processing remaining merge groups after a short delay
            setTimeout(() => {
                this.processMergeGroups(onComplete);
            }, 200);
        });
    }
    
    checkAndMergeSameColorPiecesOld() {
        console.log('=== Checking for same color piece merging ===');
        console.log(`Current pieces before merging: ${this.pieces.length}`);
        this.pieces.forEach(p => console.log(`  - ${p.type}(${p.id}) at (${p.x},${p.y}) color:${p.color.toString(16)}`));
        
        let hasMerged = false;
        
        // Keep merging until no more merges are possible
        while (true) {
            const mergeGroups = this.findMergeGroups();
            
            if (mergeGroups.length === 0) {
                break; // No more merges possible
            }
            
            console.log(`Found ${mergeGroups.length} merge groups`);
            
            // Process each merge group with animation
            mergeGroups.forEach((group, index) => {
                console.log(`🔥 MERGING group ${index + 1}: ${group.length} pieces of color ${group[0].color.toString(16)}`);
                group.forEach(p => console.log(`   - ${p.type}(${p.id}) at (${p.x},${p.y})`));
                
                // Count total cells before merging
                let totalCellsBeforeMerge = 0;
                group.forEach(piece => {
                    const cells = this.getPieceCells(piece);
                    totalCellsBeforeMerge += cells.length;
                });
                
                // Create merge animation before removing pieces
                this.animateMerge(group, () => {
                    // Remove original pieces from grid
                    group.forEach(piece => {
                        this.removePieceFromGrid(piece);
                    });
                    
                    // Remove original pieces from pieces array
                    group.forEach(piece => {
                        const index = this.pieces.findIndex(p => p.id === piece.id);
                        if (index !== -1) {
                            this.pieces.splice(index, 1);
                        }
                    });
                    
                    // Create merged piece
                    const mergedPiece = this.createMergedPiece(group);
                    this.pieces.push(mergedPiece);
                    this.placePieceOnGrid(mergedPiece);
                    
                    // Calculate cells eliminated in merging process
                    const cellsAfterMerge = mergedPiece.cells.length;
                    const cellsEliminated = totalCellsBeforeMerge - cellsAfterMerge;
                    
                    // Add score for eliminated cells (overlapping cells that were removed)
                    if (cellsEliminated > 0) {
                        this.addScore(cellsEliminated * 1, `${cellsEliminated} celdas fusionadas`);
                    }
                    
                    console.log(`✅ Created merged piece ${mergedPiece.id} with ${mergedPiece.cells.length} cells (eliminated ${cellsEliminated} overlapping cells)`);
                    
                    // Re-render grid after merge
                    this.renderGrid();
                });
            });
            
            hasMerged = true;
            this.renderGrid();
        }
        
        if (hasMerged) {
            console.log(`✅ Merging complete. Final pieces: ${this.pieces.length}`);
            this.pieces.forEach(p => console.log(`  - ${p.type}(${p.id}) at (${p.x},${p.y}) color:${p.color.toString(16)}`));
            
            // IMPORTANT: Lose focus when pieces merge
            if (this.selectedPiece) {
                console.log('Pieces merged - deselecting piece to lose focus');
                this.deselectPiece();
                this.showMessage('Piezas fusionadas - pieza deseleccionada');
            }
        } else {
            console.log('❌ No pieces to merge found');
        }
        
        console.log('=== End piece merging check ===');
    }
    
    animateMerge(piecesToMerge, onComplete) {
        console.log('🎬 Starting merge animation...');
        
        // Get all cells involved in the merge
        const allCells = [];
        piecesToMerge.forEach(piece => {
            const pieceCells = this.getPieceCells(piece);
            pieceCells.forEach(cell => {
                allCells.push({
                    row: cell.row,
                    col: cell.col,
                    piece: piece
                });
            });
        });
        
        // Calculate the center point of all merging pieces
        const centerX = allCells.reduce((sum, cell) => sum + cell.col, 0) / allCells.length;
        const centerY = allCells.reduce((sum, cell) => sum + cell.row, 0) / allCells.length;
        
        // Create visual effects for each cell
        const animationPromises = [];
        
        allCells.forEach((cell, index) => {
            const cellX = cell.col * this.cellSize + this.cellSize / 2;
            const cellY = cell.row * this.cellSize + this.cellSize / 2;
            const centerPixelX = centerX * this.cellSize + this.cellSize / 2;
            const centerPixelY = centerY * this.cellSize + this.cellSize / 2;
            
            // Create a temporary visual element for the merge effect
            const mergeEffect = this.add.rectangle(cellX, cellY, this.cellSize - 4, this.cellSize - 4, cell.piece.color);
            mergeEffect.setStrokeStyle(2, 0xffffff);
            mergeEffect.setAlpha(0.8);
            
            // Create pulsing effect before movement
            const pulsePromise = new Promise((resolve) => {
                this.tweens.add({
                    targets: mergeEffect,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    alpha: 1.0,
                    duration: 200,
                    yoyo: true,
                    repeat: 1,
                    onComplete: resolve
                });
            });
            
            // Create movement toward center
            const movePromise = new Promise((resolve) => {
                setTimeout(() => {
                    this.tweens.add({
                        targets: mergeEffect,
                        x: centerPixelX,
                        y: centerPixelY,
                        scaleX: 0.5,
                        scaleY: 0.5,
                        alpha: 0.3,
                        duration: 300,
                        ease: 'Power2.easeInOut',
                        delay: index * 50, // Stagger the animations
                        onComplete: () => {
                            mergeEffect.destroy();
                            resolve();
                        }
                    });
                }, 400); // Start after pulse animation
            });
            
            animationPromises.push(pulsePromise, movePromise);
        });
        
        // Create explosion effect at center
        const explosionPromise = new Promise((resolve) => {
            setTimeout(() => {
                const centerPixelX = centerX * this.cellSize + this.cellSize / 2;
                const centerPixelY = centerY * this.cellSize + this.cellSize / 2;
                
                // Create multiple particles for explosion effect
                for (let i = 0; i < 8; i++) {
                    const particle = this.add.rectangle(centerPixelX, centerPixelY, 8, 8, piecesToMerge[0].color);
                    particle.setAlpha(0.8);
                    
                    // Random direction for each particle
                    const angle = (i / 8) * Math.PI * 2;
                    const distance = 40;
                    const targetX = centerPixelX + Math.cos(angle) * distance;
                    const targetY = centerPixelY + Math.sin(angle) * distance;
                    
                    this.tweens.add({
                        targets: particle,
                        x: targetX,
                        y: targetY,
                        alpha: 0,
                        scaleX: 0.2,
                        scaleY: 0.2,
                        duration: 400,
                        ease: 'Power2.easeOut',
                        onComplete: () => {
                            particle.destroy();
                        }
                    });
                }
                
                // Flash effect at center
                const flash = this.add.rectangle(centerPixelX, centerPixelY, this.cellSize * 1.5, this.cellSize * 1.5, 0xffffff);
                flash.setAlpha(0);
                
                this.tweens.add({
                    targets: flash,
                    alpha: 0.6,
                    duration: 100,
                    yoyo: true,
                    onComplete: () => {
                        flash.destroy();
                        resolve();
                    }
                });
                
            }, 600); // Start after pieces start moving
        });
        
        // Wait for all animations to complete
        Promise.all([...animationPromises, explosionPromise]).then(() => {
            console.log('🎬 Merge animation complete');
            if (onComplete) {
                onComplete();
            }
        });
    }
    
    ensureFragmentTextureExists(color) {
        const textureKey = `tile_FRAGMENT_${color.toString(16)}`;
        
        // Check if texture already exists
        if (this.textures.exists(textureKey)) {
            return textureKey;
        }
        
        console.log(`Creating fragment texture for color ${color.toString(16)}`);
        
        // Determine text color based on background color (white for dark colors, black for light colors)
        let textColor;
        if (color === 0xff0000 || color === 0x0000ff) { // Red or Blue
            textColor = 0xffffff; // White text
        } else { // Green or Yellow
            textColor = 0x000000; // Black text
        }
        
        // Create the texture
        this.create2048StyleTile(`FRAGMENT_${color.toString(16)}`, color, textColor, 'FRAG');
        
        return textureKey;
    }
    
    findMergeGroups() {
        const visited = new Set();
        const mergeGroups = [];
        
        // Check each piece
        for (let piece of this.pieces) {
            if (visited.has(piece.id)) continue;
            
            // Find all pieces of the same color connected to this piece
            const group = this.findConnectedPiecesOfSameColor(piece, visited);
            
            // Only consider groups with 2 or more pieces
            if (group.length > 1) {
                mergeGroups.push(group);
                console.log(`Found merge group of ${group.length} pieces with color ${piece.color.toString(16)}`);
            }
        }
        
        return mergeGroups;
    }
    
    findConnectedPiecesOfSameColor(startPiece, visited) {
        const group = [];
        const toVisit = [startPiece];
        
        while (toVisit.length > 0) {
            const currentPiece = toVisit.pop();
            
            if (visited.has(currentPiece.id)) continue;
            
            visited.add(currentPiece.id);
            group.push(currentPiece);
            
            // Get all cells of the current piece
            const currentCells = this.getPieceCells(currentPiece);
            
            // Check each cell for adjacent pieces of the same color
            for (let cell of currentCells) {
                const directions = [
                    {row: -1, col: 0}, // up
                    {row: 1, col: 0},  // down
                    {row: 0, col: -1}, // left
                    {row: 0, col: 1}   // right
                ];
                
                for (let dir of directions) {
                    const adjacentRow = cell.row + dir.row;
                    const adjacentCol = cell.col + dir.col;
                    
                    // Check bounds
                    if (adjacentRow >= 0 && adjacentRow < this.gridHeight && 
                        adjacentCol >= 0 && adjacentCol < this.gridWidth) {
                        
                        const adjacentPieceId = this.grid[adjacentRow][adjacentCol];
                        
                        if (adjacentPieceId && !visited.has(adjacentPieceId)) {
                            const adjacentPiece = this.pieces.find(p => p.id === adjacentPieceId);
                            
                            if (adjacentPiece && adjacentPiece.color === startPiece.color) {
                                toVisit.push(adjacentPiece);
                            }
                        }
                    }
                }
            }
        }
        
        return group;
    }
    
    createMergedPiece(piecesToMerge) {
        // Collect all cells from all pieces
        const allCells = [];
        let minX = Infinity, minY = Infinity;
        
        piecesToMerge.forEach(piece => {
            const pieceCells = this.getPieceCells(piece);
            pieceCells.forEach(cell => {
                allCells.push(cell);
                minX = Math.min(minX, cell.col);
                minY = Math.min(minY, cell.row);
            });
        });
        
        // Convert to relative coordinates for the new merged piece
        const relativeCells = allCells.map(cell => ({
            row: cell.row - minY,
            col: cell.col - minX
        }));
        
        // Remove duplicate cells (in case pieces overlap)
        const uniqueCells = [];
        const cellKeys = new Set();
        
        relativeCells.forEach(cell => {
            const key = `${cell.row},${cell.col}`;
            if (!cellKeys.has(key)) {
                cellKeys.add(key);
                uniqueCells.push(cell);
            }
        });
        
        // Create the new merged piece
        const mergedPiece = {
            id: this.nextPieceId++,
            type: 'FRAGMENT', // Merged pieces become fragments
            x: minX,
            y: minY,
            color: piecesToMerge[0].color, // Use the color of the first piece
            cells: uniqueCells
        };
        
        console.log(`Created merged piece ${mergedPiece.id} at (${minX}, ${minY}) with ${uniqueCells.length} cells`);
        
        return mergedPiece;
    }
    
    validateGameState() {
        console.log('=== GAME STATE VALIDATION ===');
        
        // Count cells in grid
        let gridCellCount = 0;
        const gridPieceIds = new Set();
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col] !== 0) {
                    gridCellCount++;
                    gridPieceIds.add(this.grid[row][col]);
                }
            }
        }
        
        // Count cells in pieces
        let pieceCellCount = 0;
        const pieceIds = new Set();
        this.pieces.forEach(piece => {
            const cells = this.getPieceCells(piece);
            pieceCellCount += cells.length;
            pieceIds.add(piece.id);
        });
        
        console.log(`Grid has ${gridCellCount} occupied cells with piece IDs: [${Array.from(gridPieceIds).join(', ')}]`);
        console.log(`Pieces array has ${this.pieces.length} pieces with ${pieceCellCount} total cells and IDs: [${Array.from(pieceIds).join(', ')}]`);
        
        // Check for inconsistencies
        if (gridCellCount !== pieceCellCount) {
            console.error(`❌ INCONSISTENCY: Grid has ${gridCellCount} cells but pieces have ${pieceCellCount} cells`);
        }
        
        // Check for orphan cells (cells in grid but not in pieces)
        const orphanIds = Array.from(gridPieceIds).filter(id => !pieceIds.has(id));
        if (orphanIds.length > 0) {
            console.error(`❌ ORPHAN CELLS: Grid has cells with IDs [${orphanIds.join(', ')}] but no corresponding pieces`);
            console.log('🔧 Cleaning up orphan cells...');
            this.cleanupOrphanCells(orphanIds);
        }
        
        // Check for ghost pieces (pieces not in grid)
        const ghostIds = Array.from(pieceIds).filter(id => !gridPieceIds.has(id));
        if (ghostIds.length > 0) {
            console.error(`❌ GHOST PIECES: Pieces [${ghostIds.join(', ')}] exist but have no cells in grid`);
            console.log('🔧 Removing ghost pieces...');
            this.removeGhostPieces(ghostIds);
        }
        
        if (gridCellCount === pieceCellCount && orphanIds.length === 0 && ghostIds.length === 0) {
            console.log('✅ Game state is consistent');
        } else {
            console.log('🔧 Game state fixed, re-rendering grid...');
            this.renderGrid();
        }
        
        console.log('=== END VALIDATION ===');
    }
    
    validateGameStateAndReturnResult() {
        // Count cells in grid
        let gridCellCount = 0;
        const gridPieceIds = new Set();
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col] !== 0) {
                    gridCellCount++;
                    gridPieceIds.add(this.grid[row][col]);
                }
            }
        }
        
        // Count cells in pieces
        let pieceCellCount = 0;
        const pieceIds = new Set();
        this.pieces.forEach(piece => {
            const cells = this.getPieceCells(piece);
            pieceCellCount += cells.length;
            pieceIds.add(piece.id);
        });
        
        // Check for inconsistencies
        const orphanIds = Array.from(gridPieceIds).filter(id => !pieceIds.has(id));
        const ghostIds = Array.from(pieceIds).filter(id => !gridPieceIds.has(id));
        const hasIssues = gridCellCount !== pieceCellCount || orphanIds.length > 0 || ghostIds.length > 0;
        
        return {
            hasIssues,
            gridCellCount,
            pieceCellCount,
            orphanIds,
            ghostIds
        };
    }
    
    cleanupOrphanCells(orphanIds) {
        // Remove orphan cells from the grid
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (orphanIds.includes(this.grid[row][col])) {
                    console.log(`Cleaning orphan cell at (${row}, ${col}) with ID ${this.grid[row][col]}`);
                    this.grid[row][col] = 0;
                }
            }
        }
    }
    
    removeGhostPieces(ghostIds) {
        // Remove pieces that don't have any cells in the grid
        this.pieces = this.pieces.filter(piece => !ghostIds.includes(piece.id));
        console.log(`Removed ${ghostIds.length} ghost pieces`);
    }
    
    // Comprehensive game state repair function
    repairGameState() {
        console.log('🔧 COMPREHENSIVE GAME STATE REPAIR 🔧');
        
        // Step 1: Remove all orphan cells from grid
        const validPieceIds = new Set(this.pieces.map(p => p.id));
        let orphansRemoved = 0;
        
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const cellId = this.grid[row][col];
                if (cellId !== 0 && !validPieceIds.has(cellId)) {
                    this.grid[row][col] = 0;
                    orphansRemoved++;
                }
            }
        }
        
        // Step 2: Clear grid and rebuild from pieces
        this.initializeGrid();
        this.pieces.forEach(piece => {
            this.placePieceOnGrid(piece);
        });
        
        console.log(`✅ Repair complete: Removed ${orphansRemoved} orphan cells, rebuilt grid from ${this.pieces.length} pieces`);
        this.renderGrid();
    }
    
    spawnTestPieces() {
        // Create two SINGLE pieces next to each other for testing merging
        const testTemplate = this.pieceTemplates['SINGLE'];
        
        console.log('=== CREATING TEST PIECES ===');
        console.log('Template for SINGLE:', testTemplate);
        
        // First piece at (3,3) - this will occupy grid[3][3]
        const piece1 = {
            id: this.nextPieceId++,
            type: 'SINGLE',
            x: 3,
            y: 3,
            color: testTemplate.color,
            rotatedShape: testTemplate.shape
        };
        
        // Second piece at (3,4) - this will occupy grid[3][4] (adjacent horizontally)
        const piece2 = {
            id: this.nextPieceId++,
            type: 'SINGLE',
            x: 4,  // Changed from (4,3) to (3,4) to be horizontally adjacent
            y: 3,
            color: testTemplate.color,
            rotatedShape: testTemplate.shape
        };
        
        console.log('Creating test pieces for merging...');
        console.log(`Piece 1: ${piece1.type}(${piece1.id}) at (${piece1.x},${piece1.y}) color:${piece1.color.toString(16)} - will occupy grid[${piece1.y}][${piece1.x}]`);
        console.log(`Piece 2: ${piece2.type}(${piece2.id}) at (${piece2.x},${piece2.y}) color:${piece2.color.toString(16)} - will occupy grid[${piece2.y}][${piece2.x}]`);
        
        // Clear the area first
        this.grid[3][3] = 0;
        this.grid[3][4] = 0;
        
        if (this.canPlacePieceAt(piece1, piece1.x, piece1.y)) {
            this.pieces.push(piece1);
            this.placePieceOnGrid(piece1);
            console.log(`✅ Placed piece1 at (${piece1.x},${piece1.y}) - occupies grid[${piece1.y}][${piece1.x}]`);
        } else {
            console.log(`❌ Cannot place piece1 at (${piece1.x},${piece1.y})`);
        }
        
        if (this.canPlacePieceAt(piece2, piece2.x, piece2.y)) {
            this.pieces.push(piece2);
            this.placePieceOnGrid(piece2);
            console.log(`✅ Placed piece2 at (${piece2.x},${piece2.y}) - occupies grid[${piece2.y}][${piece2.x}]`);
        } else {
            console.log(`❌ Cannot place piece2 at (${piece2.x},${piece2.y})`);
        }
        
        this.renderGrid();
        
        console.log('Grid after placing test pieces:');
        console.log(`Grid[3][3] = ${this.grid[3][3]} (should be piece ${piece1.id})`);
        console.log(`Grid[3][4] = ${this.grid[3][4]} (should be piece ${piece2.id})`);
        console.log('These cells are horizontally adjacent and should trigger merging');
        
        // Wait a moment then try to merge
        setTimeout(() => {
            console.log('=== TESTING MERGE AFTER 1 SECOND ===');
            this.checkAndMergeSameColorPieces();
        }, 1000);
    }
    
    spawnThreePiecesInLine() {
        const testTemplate = this.pieceTemplates['SINGLE'];
        console.log('=== CREATING THREE PIECES IN LINE ===');
        
        // Three pieces in a horizontal line at y=3
        const pieces = [
            { x: 2, y: 3 },
            { x: 3, y: 3 },
            { x: 4, y: 3 }
        ];
        
        pieces.forEach((pos, index) => {
            const piece = {
                id: this.nextPieceId++,
                type: 'SINGLE',
                x: pos.x,
                y: pos.y,
                color: testTemplate.color,
                rotatedShape: testTemplate.shape
            };
            
            if (this.canPlacePieceAt(piece, piece.x, piece.y)) {
                this.pieces.push(piece);
                this.placePieceOnGrid(piece);
                console.log(`✅ Placed piece ${index + 1} at (${piece.x},${piece.y})`);
            }
        });
    }
    
    spawnLShapedPieces() {
        const testTemplate = this.pieceTemplates['SINGLE'];
        console.log('=== CREATING L-SHAPED PIECES ===');
        
        // L-shaped configuration
        const pieces = [
            { x: 2, y: 3 },
            { x: 2, y: 4 },
            { x: 3, y: 4 }
        ];
        
        pieces.forEach((pos, index) => {
            const piece = {
                id: this.nextPieceId++,
                type: 'SINGLE',
                x: pos.x,
                y: pos.y,
                color: testTemplate.color,
                rotatedShape: testTemplate.shape
            };
            
            if (this.canPlacePieceAt(piece, piece.x, piece.y)) {
                this.pieces.push(piece);
                this.placePieceOnGrid(piece);
                console.log(`✅ Placed L-piece ${index + 1} at (${piece.x},${piece.y})`);
            }
        });
    }
    
    spawnSquareOfPieces() {
        const testTemplate = this.pieceTemplates['SINGLE'];
        console.log('=== CREATING SQUARE OF PIECES ===');
        
        // 2x2 square
        const pieces = [
            { x: 2, y: 2 },
            { x: 3, y: 2 },
            { x: 2, y: 3 },
            { x: 3, y: 3 }
        ];
        
        pieces.forEach((pos, index) => {
            const piece = {
                id: this.nextPieceId++,
                type: 'SINGLE',
                x: pos.x,
                y: pos.y,
                color: testTemplate.color,
                rotatedShape: testTemplate.shape
            };
            
            if (this.canPlacePieceAt(piece, piece.x, piece.y)) {
                this.pieces.push(piece);
                this.placePieceOnGrid(piece);
                console.log(`✅ Placed square piece ${index + 1} at (${piece.x},${piece.y})`);
            }
        });
    }
    
    spawnPieceInCenter() {
        const centerX = Math.floor(this.gridWidth / 2);
        const centerY = Math.floor(this.gridHeight / 2);
        
        // Start with a simple piece (T or L piece work well)
        const startingPieces = ['T', 'L', 'SINGLE'];
        const type = startingPieces[Math.floor(Math.random() * startingPieces.length)];
        const baseTemplate = this.pieceTemplates[type];
        
        // Apply random rotation
        const template = this.applyRandomRotation(baseTemplate);
        
        console.log(`Spawning initial ${type} piece in center`);
        
        // Calculate centered position
        const x = centerX - Math.floor(template.shape[0].length / 2);
        const y = centerY - Math.floor(template.shape.length / 2);
        
        // Create piece object with rotated template
        const piece = {
            id: this.nextPieceId++,
            type: type,
            x: x,
            y: y,
            color: template.color,
            rotatedShape: template.shape // Store the rotated shape
        };
        
        if (this.canPlacePieceAt(piece, x, y)) {
            this.pieces.push(piece);
            this.placePieceOnGrid(piece);
            this.renderGrid();
            console.log(`Spawned initial ${type} piece with ID ${piece.id} at (${x}, ${y})`);
        } else {
            console.log(`Could not place initial ${type} piece at center`);
        }
    }
    
    spawnRandomPiece() {
        // Check if any piece can be placed anywhere on the grid
        if (!this.canPlaceAnyPiece()) {
            console.log('Game over - no space for any pieces');
            this.gameOver();
            return;
        }
        
        // Generate a random piece type with MORE large pieces
        const rand = Math.random();
        let type;
        if (rand < 0.1) {
            type = 'SINGLE'; // Only 10% chance for single blocks
        } else if (rand < 0.2) {
            type = 'L2'; // 10% chance for small L
        } else if (rand < 0.3) {
            type = 'I3'; // 10% chance for 3-block line
        } else if (rand < 0.45) {
            type = 'O'; // 15% chance for O piece
        } else if (rand < 0.6) {
            type = 'T'; // 15% chance for T piece
        } else if (rand < 0.75) {
            type = 'I'; // 15% chance for I piece (4 blocks)
        } else if (rand < 0.85) {
            type = 'S'; // 10% chance for S piece
        } else if (rand < 0.92) {
            type = 'L'; // 7% chance for L piece
        } else if (rand < 0.97) {
            type = 'J'; // 5% chance for J piece
        } else {
            type = 'Z'; // 3% chance for Z piece
        }
        
        const baseTemplate = this.pieceTemplates[type];
        
        // Apply random rotation
        const template = this.applyRandomRotation(baseTemplate);
        
        // Try to find a valid position for this piece
        const validPositions = [];
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const piece = {
                    id: this.nextPieceId,
                    type: type,
                    x: col,
                    y: row,
                    color: template.color,
                    rotatedShape: template.shape
                };
                
                if (this.canPlacePieceAt(piece, col, row)) {
                    validPositions.push({row, col});
                }
            }
        }
        
        if (validPositions.length > 0) {
            // Choose random valid position
            const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];
            const piece = {
                id: this.nextPieceId++,
                type: type,
                x: randomPos.col,
                y: randomPos.row,
                color: template.color,
                rotatedShape: template.shape
            };
            
            this.pieces.push(piece);
            this.placePieceOnGrid(piece);
            this.renderGrid();
            console.log(`Spawned ${type} piece at position (${randomPos.row}, ${randomPos.col})`);
        } else {
            // Try with smaller pieces
            this.trySpawnSmallerPiece();
        }
    }
    
    canPlaceAnyPiece() {
        // Check if any piece type can be placed anywhere on the grid
        const pieceTypesToCheck = ['SINGLE', 'L2', 'I3', 'O', 'T', 'S', 'L', 'J', 'I', 'Z'];
        
        for (let type of pieceTypesToCheck) {
            const template = this.pieceTemplates[type];
            if (!template) continue;
            
            for (let row = 0; row < this.gridHeight; row++) {
                for (let col = 0; col < this.gridWidth; col++) {
                    const testPiece = {
                        id: -1, // Temporary ID for testing
                        type: type,
                        x: col,
                        y: row,
                        color: template.color
                    };
                    
                    if (this.canPlacePieceAt(testPiece, col, row)) {
                        return true; // Found at least one valid placement
                    }
                }
            }
        }
        
        return false; // No piece can be placed anywhere
    }
    
    trySpawnSmallerPiece() {
        // Try to spawn progressively smaller pieces
        const smallPieces = ['SINGLE', 'L2'];
        
        for (let type of smallPieces) {
            const baseTemplate = this.pieceTemplates[type];
            
            // Apply random rotation
            const template = this.applyRandomRotation(baseTemplate);
            
            for (let row = 0; row < this.gridHeight; row++) {
                for (let col = 0; col < this.gridWidth; col++) {
                    const piece = {
                        id: this.nextPieceId,
                        type: type,
                        x: col,
                        y: row,
                        color: template.color,
                        rotatedShape: template.shape
                    };
                    
                    if (this.canPlacePieceAt(piece, col, row)) {
                        piece.id = this.nextPieceId++;
                        this.pieces.push(piece);
                        this.placePieceOnGrid(piece);
                        
                        // Automatically select the newly spawned piece
                        this.selectPiece(piece);
                        console.log(`Automatically selected fallback piece ${piece.type}(${piece.id})`);
                        
                        this.renderGrid();
                        console.log(`Spawned fallback ${type} piece at position (${row}, ${col})`);
                        return;
                    }
                }
            }
        }
        
        // If we can't place even a single block, game over
        console.log('Game over - cannot place even single blocks');
        this.gameOver();
    }
    
    // Remove methods related to current piece rendering
    // renderCurrentPiece, renderNextPiece, canMove, canPlace, movePiece methods removed
    
    rotateSelectedPiece() {
        if (!this.selectedPiece) return;
        
        // Block rotation during animations
        if (this.isAnimationPlaying) {
            this.showMessage('Espera a que termine la animación');
            return;
        }
        
        // Don't rotate FRAGMENT pieces as they have irregular shapes
        if (this.selectedPiece.type === 'FRAGMENT') {
            console.log('Cannot rotate FRAGMENT pieces');
            this.showMessage('No se pueden rotar fragmentos');
            return;
        }
        
        console.log(`Rotating selected piece ${this.selectedPiece.id} of type ${this.selectedPiece.type}`);
        
        // Remove piece from grid temporarily
        this.removePieceFromGrid(this.selectedPiece);
        
        // Get current shape
        const currentShape = this.selectedPiece.rotatedShape || this.pieceTemplates[this.selectedPiece.type].shape;
        
        console.log(`Current shape before rotation:`, currentShape);
        
        // Rotate the shape 90 degrees clockwise
        const rotatedShape = this.rotateMatrix(currentShape);
        
        console.log(`Shape after rotation:`, rotatedShape);
        
        // Create a test piece with the rotated shape
        const testPiece = {
            ...this.selectedPiece,
            rotatedShape: rotatedShape
        };
        
        // Check if the rotated piece fits in the current position
        if (this.canPlacePieceAt(testPiece, this.selectedPiece.x, this.selectedPiece.y)) {
            // Rotation successful - immediately consume 1 point
            this.selectedPiece.rotatedShape = rotatedShape;
            this.placePieceOnGrid(this.selectedPiece);
            
            // Consume 1 point for the rotation
            this.addScore(-1, 'rotación');
            
            console.log(`Successfully rotated piece ${this.selectedPiece.id}`);
            console.log(`New rotated shape stored:`, this.selectedPiece.rotatedShape);
            
            // Update highlighting for new shape
            this.highlightSelectedPiece();
            
            // Re-render grid (merge check happens only when focus is lost)
            this.renderGrid();
            
        } else {
            // Rotation failed - put piece back with original shape, no point cost
            this.placePieceOnGrid(this.selectedPiece);
            console.log(`Cannot rotate piece ${this.selectedPiece.id} - not enough space`);
            this.showMessage('No hay espacio para rotar - sin costo');
        }
    }
    
    // Helper function to rotate a matrix 90 degrees clockwise
    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                rotated[col][rows - 1 - row] = matrix[row][col];
            }
        }
        
        return rotated;
    }
    
    // Confirm the temporary movement/rotation
    confirmMovement() {
        if (!this.selectedPiece || !this.isMovingPiece) return;
        
        console.log(`Confirming movement for piece ${this.selectedPiece.id}`);
        
        // Penalize movement with -1 point
        this.addScore(-1, 'movimiento');
        
        // Clear the temporary state
        this.isMovingPiece = false;
        this.tempPosition = null;
        
        // Update highlighting to confirmed state (yellow border)
        this.highlightSelectedPiece();
        
        // Now perform all the validations and merges
        this.checkAndClearRectangles();
        this.checkAndMergeSameColorPieces();
        this.validateGameState();
        
        // Re-render grid
        this.renderGrid();
        
        // IMPORTANT: Lose focus after confirming movement
        this.deselectPiece();
        
        this.showMessage('Movimiento confirmado - pieza deseleccionada');
        console.log('Movement confirmed - piece deselected to lose focus');
    }
    
    // Confirm the initial position of a newly spawned piece
    confirmInitialPosition() {
        if (!this.selectedPiece) return;
        
        console.log(`Confirming initial position for piece ${this.selectedPiece.id}`);
        
        // Now perform all the validations and merges for the confirmed position
        this.checkAndClearRectangles();
        this.checkAndMergeSameColorPieces();
        this.validateGameState();
        
        // Re-render grid
        this.renderGrid();
        
        // IMPORTANT: Lose focus after confirming initial position
        this.deselectPiece();
        
        this.showMessage('Posición inicial confirmada - pieza deseleccionada');
        console.log('Initial position confirmed - piece deselected to lose focus');
    }
    
    // Cancel the temporary movement/rotation and revert to original position
    cancelMovement() {
        if (!this.selectedPiece || !this.isMovingPiece || !this.tempPosition) return;
        
        console.log(`Cancelling movement for piece ${this.selectedPiece.id}`);
        this.revertToOriginalPosition();
    }
    
    // Revert piece to its original position before temporary moves
    revertToOriginalPosition() {
        if (!this.selectedPiece || !this.tempPosition) return;
        
        // Remove piece from current (temporary) position
        this.removePieceFromGrid(this.selectedPiece);
        
        // Restore original position and rotation
        this.selectedPiece.x = this.tempPosition.originalX;
        this.selectedPiece.y = this.tempPosition.originalY;
        this.selectedPiece.rotatedShape = this.tempPosition.originalRotatedShape;
        
        // Place piece back at original position
        this.placePieceOnGrid(this.selectedPiece);
        
        // Clear temporary state
        this.isMovingPiece = false;
        this.tempPosition = null;
        
        // Update highlighting to normal selected state (yellow border)
        this.highlightSelectedPiece();
        
        // Re-render grid
        this.renderGrid();
        
        this.showMessage('Movimiento cancelado');
        console.log(`Reverted piece ${this.selectedPiece.id} to original position (${this.selectedPiece.x}, ${this.selectedPiece.y})`);
    }
    
    // Apply random rotation to a piece template
    applyRandomRotation(template) {
        let shape = [...template.shape.map(row => [...row])]; // Deep copy
        const rotations = Math.floor(Math.random() * 4); // 0, 1, 2, or 3 rotations
        
        for (let i = 0; i < rotations; i++) {
            shape = this.rotateMatrix(shape);
        }
        
        return {
            ...template,
            shape: shape
        };
    }
    
    // Generate next pieces
    // Generate next pieces
    generateNextPieces() {
        while (this.nextPieces.length < 2) {
            const rand = Math.random();
            let type;
            if (rand < 0.1) {
                type = 'SINGLE';
            } else if (rand < 0.2) {
                type = 'L2';
            } else if (rand < 0.3) {
                type = 'I3';
            } else if (rand < 0.45) {
                type = 'O';
            } else if (rand < 0.6) {
                type = 'T';
            } else if (rand < 0.75) {
                type = 'I';
            } else if (rand < 0.85) {
                type = 'S';
            } else if (rand < 0.92) {
                type = 'L';
            } else if (rand < 0.97) {
                type = 'J';
            } else {
                type = 'Z';
            }
            
            const baseTemplate = this.pieceTemplates[type];
            const template = this.applyRandomRotation(baseTemplate);
            
            this.nextPieces.push({
                type: type,
                template: template
            });
        }
        
        this.updateNextPieceDisplay();
    }
    
    // Spawn next piece randomly from queue
    spawnNextPieceRandomly() {
        if (this.nextPieces.length === 0) {
            this.generateNextPieces();
        }
        
        // Get the first piece from queue
        const nextPieceData = this.nextPieces.shift();
        this.generateNextPieces(); // Refill queue
        
        // Try to find a valid position for this piece
        const validPositions = [];
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const testPiece = {
                    id: this.nextPieceId,
                    type: nextPieceData.type,
                    x: col,
                    y: row,
                    color: nextPieceData.template.color,
                    rotatedShape: nextPieceData.template.shape
                };
                
                if (this.canPlacePieceAt(testPiece, col, row)) {
                    validPositions.push({row, col});
                }
            }
        }
        
        if (validPositions.length > 0) {
            // Choose random valid position
            const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];
            const piece = {
                id: this.nextPieceId++,
                type: nextPieceData.type,
                x: randomPos.col,
                y: randomPos.row,
                color: nextPieceData.template.color,
                rotatedShape: nextPieceData.template.shape
            };
            
            this.pieces.push(piece);
            this.placePieceOnGrid(piece);
            this.renderGrid();
            
            console.log(`Spawned ${nextPieceData.type} piece at position (${randomPos.row}, ${randomPos.col})`);
            
            // Automatically select the newly spawned piece
            this.selectPiece(piece);
            console.log(`Automatically selected new piece ${piece.type}(${piece.id})`);
            
            // Show message about new piece with immediate movement system
            this.showMessage(`Nueva pieza ${piece.type} seleccionada - usa flechas para mover (-1 pt)`);
            
            // Validate game state after spawning
            this.validateGameState();
            
            // DON'T check for merging or line clearing until position is confirmed
            // Only validate that piece was placed correctly
            console.log('New piece spawned and selected - move and confirm position to trigger merging/line clearing');
        } else {
            // No valid positions - game over
            console.log('Game over - no space for next piece');
            this.gameOver();
        }
    }
    
    // Update next piece display
    updateNextPieceDisplay() {
        // This will display the next 2 pieces in the UI with their actual shapes
        const nextPieceContainer = document.getElementById('next-piece-canvas');
        if (nextPieceContainer) {
            let html = '';
            for (let i = 0; i < Math.min(2, this.nextPieces.length); i++) {
                const piece = this.nextPieces[i];
                const shapeHTML = this.generatePieceShapeHTML(piece);
                html += `<div class="next-piece-item">
                    <div class="piece-name">${piece.type}</div>
                    <div class="piece-shape-preview">
                        ${shapeHTML}
                    </div>
                </div>`;
            }
            nextPieceContainer.innerHTML = html;
        }
    }
    
    // Generate HTML representation of piece shape
    generatePieceShapeHTML(pieceData) {
        const shape = pieceData.template.shape;
        const color = `#${pieceData.template.color.toString(16).padStart(6, '0')}`;
        
        let html = '<div class="piece-grid">';
        
        for (let row = 0; row < shape.length; row++) {
            html += '<div class="piece-row">';
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    html += `<div class="piece-cell filled" style="background-color: ${color};"></div>`;
                } else {
                    html += '<div class="piece-cell empty"></div>';
                }
            }
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }
    
    // Helper function to get the shape of a piece (rotated or original)
    getPieceShape(piece) {
        if (piece.rotatedShape) {
            return piece.rotatedShape;
        }
        const template = this.pieceTemplates[piece.type];
        return template ? template.shape : [];
    }
    
    // Get all cells occupied by a piece (handles both regular pieces and fragments)
    getPieceCells(piece) {
        const cells = [];
        
        if (piece.type === 'FRAGMENT') {
            // For fragment pieces, use stored cell positions
            piece.cells.forEach(relativeCell => {
                cells.push({
                    row: piece.y + relativeCell.row,
                    col: piece.x + relativeCell.col
                });
            });
        } else {
            // For regular pieces, calculate from shape
            const shape = this.getPieceShape(piece);
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        cells.push({
                            row: piece.y + row,
                            col: piece.x + col
                        });
                    }
                }
            }
        }
        
        return cells;
    }
    
    
    // Remove hardDrop and placePiece methods as they're no longer needed
    
    renderGrid() {
        if (!this.gridGraphics || !this.gridGraphics.children) return;
        
        this.gridGraphics.children.entries.forEach(cell => {
            const row = cell.getData('row');
            const col = cell.getData('col');
            
            if (this.grid[row][col]) {
                // Find the piece that owns this cell
                const pieceId = this.grid[row][col];
                const piece = this.pieces.find(p => p.id === pieceId);
                if (piece) {
                    // Use appropriate texture based on piece type
                    if (piece.type === 'FRAGMENT') {
                        // Use color-specific fragment texture
                        const fragmentTextureKey = `tile_FRAGMENT_${piece.color.toString(16)}`;
                        if (this.textures.exists(fragmentTextureKey)) {
                            cell.setTexture(fragmentTextureKey);
                        } else {
                            // Fallback to generic fragment with tint
                            cell.setTexture('tile_FRAGMENT');
                            cell.setTint(piece.color);
                        }
                    } else {
                        cell.setTexture(`tile_${piece.type}`);
                    }
                    
                    // Clear tint for non-fragment pieces
                    if (piece.type !== 'FRAGMENT') {
                        cell.clearTint();
                    }
                    
                    cell.setAlpha(1);
                } else {
                    // Fallback if piece not found - this shouldn't happen
                    console.warn(`Piece with ID ${pieceId} not found for cell (${row}, ${col})`);
                    cell.setTexture('empty_cell');
                    cell.clearTint();
                    cell.setAlpha(1);
                }
            } else {
                // Empty cell - use default texture
                cell.setTexture('empty_cell');
                cell.clearTint();
                cell.setAlpha(1);
            }
        });
        
        // Log grid state for debugging
        console.log('Grid state:');
        for (let row = 0; row < this.gridHeight; row++) {
            let rowString = '';
            for (let col = 0; col < this.gridWidth; col++) {
                rowString += this.grid[row][col] ? '■' : '□';
            }
            console.log(`Row ${row}: ${rowString}`);
        }
        
        console.log('Active pieces:', this.pieces.map(p => `${p.type}(${p.id}) at (${p.x},${p.y})`));
        
        // Verify grid consistency
        let gridCellCount = 0;
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col]) gridCellCount++;
            }
        }
        
        let pieceCellCount = 0;
        this.pieces.forEach(piece => {
            pieceCellCount += this.getPieceCells(piece).length;
        });
        
        if (gridCellCount !== pieceCellCount) {
            console.warn(`Grid inconsistency: ${gridCellCount} cells in grid vs ${pieceCellCount} cells in pieces`);
        }
    }
    
    checkAndClearLines() {
        const linesToClear = this.findCompleteLines();
        
        if (linesToClear.length > 0) {
            console.log(`Found ${linesToClear.length} complete lines to clear: ${linesToClear.join(', ')}`);
            
            // Clear lines immediately for merge checking
            this.clearLines(linesToClear);
            this.splitDisconnectedPieces();
            this.renderGrid();
            
            // Update score and level
            let totalCells = 0;
            linesToClear.forEach(line => {
                if (line.type === 'row') {
                    totalCells += this.gridWidth;
                } else if (line.type === 'col') {
                    totalCells += this.gridHeight;
                }
            });
            
            this.linesCleared += linesToClear.length;
            
            // Level up every 5 lines cleared
            if (Math.floor(this.linesCleared / 5) + 1 > this.level) {
                this.level++;
            }
            
            this.updateScoreDisplay();
        }
        
        return linesToClear.length;
    }
    
    checkAndClearRectangles(isRecursiveCall = false, onComplete = null) {
        console.log('=== Checking for complete lines ===');
        
        // Store the original callback for the end of the entire chain
        if (!isRecursiveCall && onComplete) {
            this.pendingLineCallback = onComplete;
        }
        
        // Print current grid state for debugging
        console.log('Current grid state:');
        for (let row = 0; row < this.gridHeight; row++) {
            let rowString = '';
            let cellCount = 0;
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col] !== 0) {
                    rowString += '■';
                    cellCount++;
                } else {
                    rowString += '□';
                }
            }
            console.log(`Row ${row}: ${rowString} (${cellCount}/${this.gridWidth} cells)`);
        }
        
        const linesToClear = this.findCompleteLines();
        
        if (linesToClear.length > 0) {
            console.log(`Found ${linesToClear.length} complete lines to clear: ${linesToClear.join(', ')}`);
            
            // Block actions only on the first call (not recursive calls)
            if (!isRecursiveCall) {
                this.isAnimationPlaying = true;
            }
            
            // Show flashing animation on completed lines before clearing them
            this.showLineCompletionAnimation(linesToClear, () => {
                // Remove lines from pieces and grid AFTER animation
                this.clearLines(linesToClear);
                
                // After clearing, check for disconnected pieces and split them
                this.splitDisconnectedPieces();
                
                this.renderGrid();
                
                // Update score and level
                let totalCells = 0;
                linesToClear.forEach(line => {
                    if (line.type === 'row') {
                        totalCells += this.gridWidth; // Full row
                    } else if (line.type === 'col') {
                        totalCells += this.gridHeight; // Full column
                    }
                });
                // Note: Points for cleared cells are already added in clearLines()
                this.linesCleared += linesToClear.length;
                
                // Level up every 5 lines cleared
                if (Math.floor(this.linesCleared / 5) + 1 > this.level) {
                    this.level++;
                }
                
                this.updateScoreDisplay();
                
                // Create particle effect
                this.createClearEffect(linesToClear);
                
                // Check for more lines after clearing (chain reactions) with longer delay
                setTimeout(() => this.checkAndClearRectangles(true), 1500); // Increased from 500 to 1500ms
            });
        } else {
            console.log('No complete lines found');
            // No lines to clear, unblock actions (this ends the chain reaction)
            this.isAnimationPlaying = false;
            // No lines to clear, make sure grid is properly rendered
            this.renderGrid();
            
            // Execute callback if this is the end of the entire chain reaction
            if (this.pendingLineCallback && typeof this.pendingLineCallback === 'function') {
                console.log('Executing pending callback after complete line chain reaction');
                const callback = this.pendingLineCallback;
                this.pendingLineCallback = null; // Clear the stored callback
                callback();
            }
        }
        
        console.log('=== Line check complete ===');
    }
    
    hasCompletedLines() {
        // Quick check if there are any completed lines without processing them
        const lines = this.findCompleteLines();
        return lines.length > 0;
    }
    
    findCompleteLines() {
        const completeLines = [];
        
        // Check each row (horizontal lines)
        for (let row = 0; row < this.gridHeight; row++) {
            let isComplete = true;
            let cellCount = 0;
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col] === 0) {
                    isComplete = false;
                    break;
                } else {
                    cellCount++;
                }
            }
            if (isComplete) {
                console.log(`Complete horizontal line found at row ${row} with ${cellCount} cells`);
                completeLines.push({type: 'row', index: row});
            }
        }
        
        // Check each column (vertical lines)
        for (let col = 0; col < this.gridWidth; col++) {
            let isComplete = true;
            let cellCount = 0;
            for (let row = 0; row < this.gridHeight; row++) {
                if (this.grid[row][col] === 0) {
                    isComplete = false;
                    break;
                } else {
                    cellCount++;
                }
            }
            if (isComplete) {
                console.log(`Complete vertical line found at column ${col} with ${cellCount} cells`);
                completeLines.push({type: 'col', index: col});
            }
        }
        
        if (completeLines.length > 0) {
            console.log(`Total complete lines found: ${completeLines.length}`);
            completeLines.forEach(line => {
                console.log(`- ${line.type === 'row' ? 'Row' : 'Column'} ${line.index}`);
            });
        }
        
        return completeLines;
    }
    
    findRectangles() {
        const visited = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(false));
        const rectangles = [];
        
        // Look for solid rectangular areas of ANY color/piece
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col] && !visited[row][col]) {
                    // Try to find rectangles starting from this position
                    const foundRectangles = this.findAllRectanglesFrom(row, col, visited);
                    rectangles.push(...foundRectangles);
                }
            }
        }
        
        return rectangles;
    }
    
    findAllRectanglesFrom(startRow, startCol, visited) {
        if (visited[startRow][startCol] || !this.grid[startRow][startCol]) {
            return [];
        }
        
        const rectangles = [];
        
        // Try different rectangle sizes starting from the largest possible
        const maxWidth = this.gridWidth - startCol;
        const maxHeight = this.gridHeight - startRow;
        
        // Try all possible rectangle sizes (width x height) >= 4x2 or 2x4
        for (let width = Math.min(maxWidth, maxHeight); width >= 2; width--) {
            for (let height = Math.min(maxHeight, maxWidth); height >= 2; height--) {
                // Only consider rectangles that meet the 4x2 minimum requirement
                if ((width >= 4 && height >= 2) || (width >= 2 && height >= 4)) {
                    if (this.isValidSolidRectangleArea(startRow, startCol, width, height, visited)) {
                        // Found a valid rectangle, mark cells as visited and add to results
                        const cells = [];
                        for (let r = startRow; r < startRow + height; r++) {
                            for (let c = startCol; c < startCol + width; c++) {
                                visited[r][c] = true;
                                cells.push({row: r, col: c});
                            }
                        }
                        
                        rectangles.push({
                            cells,
                            width,
                            height,
                            minRow: startRow,
                            minCol: startCol,
                            maxRow: startRow + height - 1,
                            maxCol: startCol + width - 1
                        });
                        
                        console.log(`Found ${width}x${height} rectangle at (${startRow}, ${startCol})`);
                        return rectangles; // Return the largest rectangle found
                    }
                }
            }
        }
        
        // If no rectangle found, mark this single cell as visited
        visited[startRow][startCol] = true;
        return [];
    }
    
    isValidSolidRectangleArea(startRow, startCol, width, height, visited) {
        // Check if the area forms a solid rectangle (all cells occupied and not visited)
        for (let row = startRow; row < startRow + height; row++) {
            for (let col = startCol; col < startCol + width; col++) {
                if (row >= this.gridHeight || col >= this.gridWidth ||
                    !this.grid[row][col] || visited[row][col]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    isValidRectangle(rectangle) {
        // Clear rectangles that are at least 4x2 or 2x4 (minimum 8 cells) - HARDER!
        return (rectangle.width >= 4 && rectangle.height >= 2) || 
               (rectangle.width >= 2 && rectangle.height >= 4);
    }
    
    showLineCompletionAnimation(lines, onComplete) {
        console.log('Starting enhanced line completion animation...');
        
        // Block all actions during animation
        this.isAnimationPlaying = true;
        
        // Store original cell appearances
        const originalCells = [];
        const animationCells = [];
        
        lines.forEach(line => {
            if (line.type === 'row') {
                // Animate entire row
                for (let col = 0; col < this.gridWidth; col++) {
                    const cellIndex = line.index * this.gridWidth + col;
                    const cell = this.gridGraphics.children.entries[cellIndex];
                    if (cell) {
                        originalCells.push({
                            cell: cell,
                            originalTexture: cell.texture.key,
                            originalTint: cell.tint,
                            originalAlpha: cell.alpha,
                            originalScale: cell.scale
                        });
                        animationCells.push(cell);
                    }
                }
            } else if (line.type === 'col') {
                // Animate entire column
                for (let row = 0; row < this.gridHeight; row++) {
                    const cellIndex = row * this.gridWidth + line.index;
                    const cell = this.gridGraphics.children.entries[cellIndex];
                    if (cell) {
                        originalCells.push({
                            cell: cell,
                            originalTexture: cell.texture.key,
                            originalTint: cell.tint,
                            originalAlpha: cell.alpha,
                            originalScale: cell.scale
                        });
                        animationCells.push(cell);
                    }
                }
            }
        });
        
        // Phase 1: Initial impact wave
        const wavePromises = [];
        animationCells.forEach((cell, index) => {
            const wavePromise = new Promise((resolve) => {
                this.tweens.add({
                    targets: cell,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    alpha: 1,
                    duration: 150,
                    delay: index * 30, // Stagger the wave effect
                    ease: 'Back.easeOut',
                    yoyo: true,
                    onComplete: resolve
                });
            });
            wavePromises.push(wavePromise);
        });
        
        // Phase 2: Intense flashing with rainbow colors and effects
        Promise.all(wavePromises).then(() => {
            let flashCount = 0;
            const maxFlashes = 8; // More flashes for better effect
            const flashDuration = 150; // Faster flashing
            
            // Create additional visual effects
            const effectsContainer = [];
            
            // Add sparkle particles around completed lines
            animationCells.forEach(cell => {
                for (let i = 0; i < 3; i++) {
                    const sparkle = this.add.circle(
                        cell.x + (Math.random() - 0.5) * this.cellSize,
                        cell.y + (Math.random() - 0.5) * this.cellSize,
                        Math.random() * 3 + 2,
                        0xffffff
                    );
                    sparkle.setAlpha(0);
                    effectsContainer.push(sparkle);
                    
                    this.tweens.add({
                        targets: sparkle,
                        alpha: 1,
                        scale: 2,
                        duration: 800,
                        delay: Math.random() * 500,
                        ease: 'Power2.easeOut',
                        onComplete: () => sparkle.destroy()
                    });
                }
            });
            
            const flashInterval = setInterval(() => {
                // Enhanced color palette with gradients
                const colors = [
                    0xFFFFFF, 0xFFD700, 0xFF69B4, 0x00FFFF, 
                    0xFF4500, 0x32CD32, 0x9370DB, 0xFFA500
                ];
                const currentColor = colors[flashCount % colors.length];
                
                animationCells.forEach((cell, index) => {
                    if (flashCount % 2 === 0) {
                        // Flash with enhanced color and effects
                        cell.setTint(currentColor);
                        cell.setAlpha(1);
                        cell.setScale(1.1 + Math.sin(flashCount * 0.5) * 0.1);
                        
                        // Add rotation effect
                        this.tweens.add({
                            targets: cell,
                            rotation: cell.rotation + 0.1,
                            duration: flashDuration / 2,
                            yoyo: true
                        });
                        
                    } else {
                        // Return to enhanced intermediate state
                        cell.setTint(0xffffff);
                        cell.setAlpha(0.8);
                        cell.setScale(1.05);
                    }
                });
                
                // Add screen shake effect and haptic feedback
                if (flashCount % 3 === 0) {
                    this.cameras.main.shake(100, 0.015);
                    // Enhanced vibration for line completion
                    if (navigator.vibrate) {
                        navigator.vibrate([100, 50, 100, 50, 200]);
                    }
                }
                
                flashCount++;
                
                if (flashCount >= maxFlashes) {
                    clearInterval(flashInterval);
                    
                    // Phase 3: Dramatic disappearance effect
                    const disappearPromises = [];
                    
                    animationCells.forEach((cell, index) => {
                        const disappearPromise = new Promise((resolve) => {
                            // Create explosion particles
                            for (let i = 0; i < 5; i++) {
                                const particle = this.add.circle(
                                    cell.x, cell.y, 
                                    Math.random() * 4 + 2, 
                                    colors[Math.floor(Math.random() * colors.length)]
                                );
                                
                                this.tweens.add({
                                    targets: particle,
                                    x: cell.x + (Math.random() - 0.5) * 200,
                                    y: cell.y + (Math.random() - 0.5) * 200,
                                    alpha: 0,
                                    scale: 0,
                                    duration: 600,
                                    delay: i * 20,
                                    ease: 'Power2.easeOut',
                                    onComplete: () => particle.destroy()
                                });
                            }
                            
                            // Cell disappearance animation
                            this.tweens.add({
                                targets: cell,
                                scaleX: 0,
                                scaleY: 0,
                                alpha: 0,
                                rotation: Math.PI,
                                duration: 400,
                                delay: index * 50,
                                ease: 'Back.easeIn',
                                onComplete: resolve
                            });
                        });
                        disappearPromises.push(disappearPromise);
                    });
                    
                    // Wait for all disappear animations to complete
                    Promise.all(disappearPromises).then(() => {
                        // Restore original appearances
                        originalCells.forEach(data => {
                            data.cell.setTexture(data.originalTexture);
                            data.cell.setTint(data.originalTint);
                            data.cell.setAlpha(data.originalAlpha);
                            data.cell.setScale(data.originalScale);
                            data.cell.setRotation(0);
                        });
                        
                        // Clean up any remaining effects
                        effectsContainer.forEach(effect => {
                            if (effect && effect.destroy) {
                                effect.destroy();
                            }
                        });
                        
                        // Final flash effect
                        const finalFlash = this.add.rectangle(
                            this.gridWidth * this.cellSize / 2,
                            this.gridHeight * this.cellSize / 2,
                            this.gridWidth * this.cellSize,
                            this.gridHeight * this.cellSize,
                            0xffffff
                        );
                        finalFlash.setAlpha(0);
                        
                        this.tweens.add({
                            targets: finalFlash,
                            alpha: 0.8,
                            duration: 100,
                            yoyo: true,
                            onComplete: () => {
                                finalFlash.destroy();
                                console.log('Enhanced line completion animation finished');
                                onComplete();
                            }
                        });
                    });
                }
            }, flashDuration);
        });
    }
    
    clearLines(lines) {
        const clearedCells = new Set();
        let totalCellsCleared = 0;
        
        // Mark all cells in complete lines to be cleared
        lines.forEach(line => {
            if (line.type === 'row') {
                // Clear entire row
                for (let col = 0; col < this.gridWidth; col++) {
                    const key = `${line.index},${col}`;
                    clearedCells.add(key);
                    this.grid[line.index][col] = 0;
                    totalCellsCleared++;
                }
            } else if (line.type === 'col') {
                // Clear entire column
                for (let row = 0; row < this.gridHeight; row++) {
                    const key = `${row},${line.index}`;
                    clearedCells.add(key);
                    this.grid[row][line.index] = 0;
                    totalCellsCleared++;
                }
            }
        });
        
        // Add score for cleared cells: +1 point per cell
        this.addScore(totalCellsCleared * 1, `${totalCellsCleared} celdas eliminadas`);
        
        // Check each piece to see if it was affected by the clearing
        const piecesToRemove = [];
        const newFragmentPieces = [];
        
        for (let i = 0; i < this.pieces.length; i++) {
            const piece = this.pieces[i];
            const pieceCells = this.getPieceCells(piece);
            
            // Check if any cells of this piece were cleared
            let hasRemainingCells = false;
            let hasClearedCells = false;
            
            for (let cell of pieceCells) {
                const key = `${cell.row},${cell.col}`;
                if (cell.row >= 0 && cell.row < this.gridHeight && 
                    cell.col >= 0 && cell.col < this.gridWidth) {
                    if (clearedCells.has(key)) {
                        hasClearedCells = true;
                    } else {
                        hasRemainingCells = true;
                    }
                }
            }
            
            if (hasClearedCells) {
                if (!hasRemainingCells) {
                    // Piece was completely cleared
                    piecesToRemove.push(i);
                } else {
                    // Piece was partially cleared - create fragment from remaining cells
                    const remainingCells = [];
                    for (let cell of pieceCells) {
                        const key = `${cell.row},${cell.col}`;
                        if (!clearedCells.has(key)) {
                            // Convert to relative coordinates
                            remainingCells.push({
                                row: cell.row - piece.y,
                                col: cell.col - piece.x
                            });
                        }
                    }
                    
                    if (remainingCells.length > 0) {
                        // Create fragment piece
                        const fragmentPiece = {
                            id: this.nextPieceId++,
                            type: 'FRAGMENT',
                            x: piece.x,
                            y: piece.y,
                            color: piece.color,
                            cells: remainingCells
                        };
                        newFragmentPieces.push(fragmentPiece);
                    }
                    
                    piecesToRemove.push(i);
                }
            }
        }
        
        // Remove pieces that were affected (in reverse order to maintain indices)
        for (let i = piecesToRemove.length - 1; i >= 0; i--) {
            this.pieces.splice(piecesToRemove[i], 1);
        }
        
        // Add new fragment pieces
        this.pieces.push(...newFragmentPieces);
        
        // IMPORTANT: Check if any newly created fragments are actually disconnected
        // and need to be split into separate pieces
        this.splitDisconnectedFragments(newFragmentPieces);
        
        // Clean up any potential orphan cells after line clearing and repair if needed
        const validationResult = this.validateGameStateAndReturnResult();
        if (validationResult.hasIssues) {
            this.repairGameState();
        }
        
        // Move remaining pieces down to fill the gaps
        this.applyGravityAfterLineClear(lines);
        
        // Check for piece merging after gravity
        this.checkAndMergeSameColorPieces();
        
        // After applying gravity, check for new complete lines with delay
        setTimeout(() => {
            console.log('Checking for lines after gravity...');
            this.checkAndClearRectangles();
        }, 800); // Increased from 100 to 800ms
        
        // IMPORTANT: Lose focus when lines are cleared
        if (this.selectedPiece) {
            console.log('Lines cleared - deselecting piece to lose focus');
            this.deselectPiece();
            this.showMessage('Líneas eliminadas - pieza deseleccionada');
        }
        
        console.log(`Cleared ${lines.length} lines, created ${newFragmentPieces.length} fragment pieces`);
    }
    
    applyGravityAfterLineClear(clearedLines) {
        // Sort cleared lines from bottom to top
        const sortedLines = [...clearedLines].sort((a, b) => b - a);
        
        // For each cleared line, move all pieces above it down
        for (let clearedRow of sortedLines) {
            // Move all pieces above this row down by 1
            this.pieces.forEach(piece => {
                if (piece.y < clearedRow) {
                    // Clear piece from current position
                    this.clearPieceFromGrid(piece);
                    // Move down
                    piece.y += 1;
                    // Place in new position
                    this.placePieceOnGrid(piece);
                }
            });
        }
    }
    
    clearRectangles(rectangles) {
        const clearedCells = new Set();
        
        // Mark all cells to be cleared
        rectangles.forEach(rectangle => {
            rectangle.cells.forEach(cell => {
                const key = `${cell.row},${cell.col}`;
                clearedCells.add(key);
                this.grid[cell.row][cell.col] = 0;
            });
        });
        
        // Check each piece to see if it was affected by the clearing
        const piecesToRemove = [];
        const newFragmentPieces = [];
        
        for (let i = 0; i < this.pieces.length; i++) {
            const piece = this.pieces[i];
            const pieceCells = this.getPieceCells(piece);
            
            // Check if any cells of this piece were cleared
            let hasRemainingCells = false;
            let hasClearedCells = false;
            
            for (let cell of pieceCells) {
                const key = `${cell.row},${cell.col}`;
                if (cell.row >= 0 && cell.row < this.gridHeight && 
                    cell.col >= 0 && cell.col < this.gridWidth) {
                    if (clearedCells.has(key)) {
                        hasClearedCells = true;
                    } else {
                        hasRemainingCells = true;
                    }
                }
            }
            
            if (hasClearedCells) {
                if (!hasRemainingCells) {
                    // Piece was completely cleared
                    piecesToRemove.push(i);
                    console.log(`Piece ${piece.id} was completely cleared`);
                } else {
                    // Piece was partially cleared - need to fragment it
                    console.log(`Piece ${piece.id} was partially cleared - fragmenting`);
                    
                    try {
                        // Clear this piece from the grid temporarily
                        this.clearPieceFromGrid(piece);
                        
                        // Find remaining connected components
                        const remainingCells = pieceCells.filter(cell => {
                            const key = `${cell.row},${cell.col}`;
                            return !clearedCells.has(key) && 
                                   cell.row >= 0 && cell.row < this.gridHeight && 
                                   cell.col >= 0 && cell.col < this.gridWidth;
                        });
                        
                        if (remainingCells.length > 0) {
                            // Put remaining cells back on grid with piece ID for component finding
                            remainingCells.forEach(cell => {
                                if (cell.row >= 0 && cell.row < this.gridHeight && 
                                    cell.col >= 0 && cell.col < this.gridWidth) {
                                    this.grid[cell.row][cell.col] = piece.id;
                                }
                            });
                            
                            // Find connected components of remaining cells
                            const components = this.findConnectedComponentsInGrid(piece.id);
                            
                            // Clear the piece from grid again
                            remainingCells.forEach(cell => {
                                if (cell.row >= 0 && cell.row < this.gridHeight && 
                                    cell.col >= 0 && cell.col < this.gridWidth) {
                                    this.grid[cell.row][cell.col] = 0;
                                }
                            });
                            
                            // Create new fragment pieces for each component
                            components.forEach(component => {
                                if (component.cells && component.cells.length > 0) {
                                    const newPiece = {
                                        id: this.nextPieceId++,
                                        type: 'FRAGMENT',
                                        x: component.minX,
                                        y: component.minY,
                                        color: piece.color,
                                        cells: component.cells // Store relative positions
                                    };
                                    newFragmentPieces.push(newPiece);
                                    console.log(`Created fragment piece ${newPiece.id} with ${component.cells.length} cells`);
                                }
                            });
                        }
                    } catch (error) {
                        console.error(`Error fragmenting piece ${piece.id}:`, error);
                        // In case of error, just remove the piece
                    }
                    
                    piecesToRemove.push(i);
                }
            }
        }
        
        // Remove affected pieces (in reverse order to maintain indices)
        for (let i = piecesToRemove.length - 1; i >= 0; i--) {
            this.pieces.splice(piecesToRemove[i], 1);
        }
        
        // Add new fragment pieces
        this.pieces.push(...newFragmentPieces);
        
        // Place all remaining pieces back on the grid
        this.pieces.forEach(piece => {
            this.placePieceOnGrid(piece);
        });
        
        // IMPORTANT: Lose focus when rectangles are cleared
        if (this.selectedPiece) {
            console.log('Rectangles cleared - deselecting piece to lose focus');
            this.deselectPiece();
            this.showMessage('Rectángulos eliminados - pieza deseleccionada');
        }
    }
    
    findConnectedComponentsInGrid(pieceId) {
        const visited = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(false));
        const components = [];
        
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col] === pieceId && !visited[row][col]) {
                    try {
                        const component = this.exploreComponentInGrid(row, col, pieceId, visited);
                        if (component.cells.length > 0) {
                            components.push(component);
                        }
                    } catch (error) {
                        console.error(`Error exploring component at (${row}, ${col}):`, error);
                        // Mark this cell as visited to avoid infinite loops
                        if (row >= 0 && row < this.gridHeight && col >= 0 && col < this.gridWidth) {
                            visited[row][col] = true;
                        }
                    }
                }
            }
        }
        
        return components;
    }
    
    exploreComponentInGrid(startRow, startCol, pieceId, visited) {
        const stack = [{row: startRow, col: startCol}];
        const cells = [];
        let minX = startCol, maxX = startCol;
        let minY = startRow, maxY = startRow;
        
        while (stack.length > 0) {
            const {row, col} = stack.pop();
            
            // Check bounds first
            if (row < 0 || row >= this.gridHeight || 
                col < 0 || col >= this.gridWidth) {
                continue;
            }
            
            // Check if already visited
            if (visited[row][col]) {
                continue;
            }
            
            // Check if this cell belongs to the piece we're looking for
            if (this.grid[row][col] !== pieceId) {
                continue;
            }
            
            visited[row][col] = true;
            cells.push({row, col});
            
            minX = Math.min(minX, col);
            maxX = Math.max(maxX, col);
            minY = Math.min(minY, row);
            maxY = Math.max(maxY, row);
            
            // Add adjacent cells (with bounds checking)
            if (row - 1 >= 0) stack.push({row: row - 1, col});
            if (row + 1 < this.gridHeight) stack.push({row: row + 1, col});
            if (col - 1 >= 0) stack.push({row, col: col - 1});
            if (col + 1 < this.gridWidth) stack.push({row, col: col + 1});
        }
        
        // Convert to relative positions
        const relativeCells = cells.map(cell => ({
            row: cell.row - minY,
            col: cell.col - minX
        }));
        
        return {
            cells: relativeCells,
            minX,
            minY,
            maxX,
            maxY
        };
    }
    
    splitDisconnectedFragments(fragmentPieces) {
        console.log('Checking if new fragments need to be split further...');
        
        const additionalPieces = [];
        const piecesToRemove = [];
        
        fragmentPieces.forEach((fragment, index) => {
            // Place the fragment on the grid temporarily to check connectivity
            this.placePieceOnGrid(fragment);
            
            // Find all connected components within this fragment
            const connectedComponents = this.findConnectedComponentsInFragment(fragment);
            
            if (connectedComponents.length > 1) {
                console.log(`Fragment ${fragment.id} needs to be split into ${connectedComponents.length} separate pieces`);
                
                // Remove this fragment from the grid
                this.removePieceFromGrid(fragment);
                
                // Mark for removal from pieces array
                piecesToRemove.push(fragment.id);
                
                // Create separate pieces for each connected component
                connectedComponents.forEach(component => {
                    const newPiece = {
                        id: this.nextPieceId++,
                        type: 'FRAGMENT',
                        x: component.minX,
                        y: component.minY,
                        color: fragment.color,
                        cells: component.relativeCells
                    };
                    
                    additionalPieces.push(newPiece);
                    console.log(`Created new separated piece ${newPiece.id} at (${newPiece.x}, ${newPiece.y}) with ${newPiece.cells.length} cells`);
                });
            } else {
                console.log(`Fragment ${fragment.id} is properly connected, no splitting needed`);
            }
        });
        
        // Remove fragments that were split
        this.pieces = this.pieces.filter(piece => !piecesToRemove.includes(piece.id));
        
        // Add the new separated pieces
        this.pieces.push(...additionalPieces);
        
        // Place all pieces back on the grid
        this.pieces.forEach(piece => {
            this.placePieceOnGrid(piece);
        });
        
        if (additionalPieces.length > 0) {
            console.log(`Split fragments resulted in ${additionalPieces.length} additional independent pieces`);
        }
    }
    
    findConnectedComponentsInFragment(fragment) {
        const visited = new Set();
        const components = [];
        
        // Check each cell in the fragment to see if it starts a new connected component
        fragment.cells.forEach(relativeCell => {
            const absoluteRow = fragment.y + relativeCell.row;
            const absoluteCol = fragment.x + relativeCell.col;
            const key = `${absoluteRow},${absoluteCol}`;
            
            if (!visited.has(key) && 
                absoluteRow >= 0 && absoluteRow < this.gridHeight &&
                absoluteCol >= 0 && absoluteCol < this.gridWidth &&
                this.grid[absoluteRow][absoluteCol] === fragment.id) {
                
                const component = this.exploreFragmentComponent(absoluteRow, absoluteCol, fragment.id, visited);
                if (component.cells.length > 0) {
                    components.push(component);
                }
            }
        });
        
        return components;
    }
    
    exploreFragmentComponent(startRow, startCol, pieceId, visited) {
        const stack = [{row: startRow, col: startCol}];
        const cells = [];
        let minX = startCol, maxX = startCol;
        let minY = startRow, maxY = startRow;
        
        while (stack.length > 0) {
            const {row, col} = stack.pop();
            const key = `${row},${col}`;
            
            if (visited.has(key) || row < 0 || row >= this.gridHeight || 
                col < 0 || col >= this.gridWidth || 
                this.grid[row][col] !== pieceId) {
                continue;
            }
            
            visited.add(key);
            cells.push({row, col});
            
            minX = Math.min(minX, col);
            maxX = Math.max(maxX, col);
            minY = Math.min(minY, row);
            maxY = Math.max(maxY, row);
            
            // Add adjacent cells to explore
            stack.push(
                {row: row - 1, col},
                {row: row + 1, col},
                {row, col: col - 1},
                {row, col: col + 1}
            );
        }
        
        // Convert to relative positions for the new piece
        const relativeCells = cells.map(cell => ({
            row: cell.row - minY,
            col: cell.col - minX
        }));
        
        return {
            cells,
            relativeCells,
            minX,
            minY,
            maxX,
            maxY
        };
    }
    
    splitDisconnectedPieces() {
        // This function is now mostly handled by clearRectangles
        // But we can still check for any pieces that might have become disconnected
        // through other means (though this should be rare with current mechanics)
        console.log('Checking for any remaining disconnected pieces...');
        
        const newPieces = [];
        
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const piece = this.pieces[i];
            
            // Skip fragments as they are already properly split
            if (piece.type === 'FRAGMENT') continue;
            
            // For regular pieces, verify they are still connected
            const connectedComponents = this.findConnectedComponents(piece);
            
            if (connectedComponents.length > 1) {
                console.log(`Additional splitting needed for piece ${piece.id} into ${connectedComponents.length} parts`);
                
                // Remove the original piece
                this.pieces.splice(i, 1);
                
                // Create new pieces for each connected component
                connectedComponents.forEach(component => {
                    const newPiece = {
                        id: this.nextPieceId++,
                        type: 'FRAGMENT',
                        x: component.minX,
                        y: component.minY,
                        color: piece.color,
                        cells: component.cells // Store relative positions
                    };
                    newPieces.push(newPiece);
                });
            }
        }
        
        // Add new pieces
        this.pieces.push(...newPieces);
    }
    
    findConnectedComponents(piece) {
        const pieceCells = this.getPieceCells(piece);
        const visited = new Set();
        const components = [];
        
        for (let cell of pieceCells) {
            const key = `${cell.row},${cell.col}`;
            if (!visited.has(key) && this.grid[cell.row][cell.col] === piece.id) {
                const component = this.exploreComponent(cell.row, cell.col, piece.id, visited);
                if (component.cells.length > 0) {
                    components.push(component);
                }
            }
        }
        
        return components;
    }
    
    exploreComponent(startRow, startCol, pieceId, visited) {
        const stack = [{row: startRow, col: startCol}];
        const cells = [];
        let minX = startCol, maxX = startCol;
        let minY = startRow, maxY = startRow;
        
        while (stack.length > 0) {
            const {row, col} = stack.pop();
            const key = `${row},${col}`;
            
            if (visited.has(key) || row < 0 || row >= this.gridHeight || 
                col < 0 || col >= this.gridWidth || 
                this.grid[row][col] !== pieceId) {
                continue;
            }
            
            visited.add(key);
            cells.push({row, col});
            
            minX = Math.min(minX, col);
            maxX = Math.max(maxX, col);
            minY = Math.min(minY, row);
            maxY = Math.max(maxY, row);
            
            // Add adjacent cells
            stack.push(
                {row: row - 1, col},
                {row: row + 1, col},
                {row, col: col - 1},
                {row, col: col + 1}
            );
        }
        
        // Convert to relative positions
        const relativeCells = cells.map(cell => ({
            row: cell.row - minY,
            col: cell.col - minX
        }));
        
        return {
            cells: relativeCells,
            minX,
            minY,
            maxX,
            maxY
        };
    }
    
    getPieceCells(piece) {
        const cells = [];
        
        if (piece.type === 'FRAGMENT') {
            // For fragment pieces, use stored cell positions
            piece.cells.forEach(relativeCell => {
                cells.push({
                    row: piece.y + relativeCell.row,
                    col: piece.x + relativeCell.col
                });
            });
        } else {
            // For regular pieces, use the correct shape (rotated or original)
            const shape = this.getPieceShape(piece);
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        cells.push({
                            row: piece.y + row,
                            col: piece.x + col
                        });
                    }
                }
            }
        }
        
        return cells;
    }
    
    // Remove gravity - pieces stay where they are placed
    // applyGravity() method removed
    
    createClearEffect(lines) {
        if (!this.add || !this.tweens) return;
        
        lines.forEach(line => {
            if (line.type === 'row') {
                // Create effect for horizontal line
                for (let col = 0; col < this.gridWidth; col++) {
                    const x = col * this.cellSize + this.cellSize / 2;
                    const y = line.index * this.cellSize + this.cellSize / 2;
                    
                    // Create particle effect with slower animation
                    for (let i = 0; i < 8; i++) {
                        const particle = this.add.circle(x, y, 4, 0xffd700);
                        
                        this.tweens.add({
                            targets: particle,
                            x: x + (Math.random() - 0.5) * 150,
                            y: y + (Math.random() - 0.5) * 150,
                            alpha: 0,
                            scale: 0,
                            duration: 1200, // Increased from 500 to 1200ms
                            delay: i * 50, // Staggered animation
                            onComplete: () => particle.destroy()
                        });
                    }
                }
            } else if (line.type === 'col') {
                // Create effect for vertical line
                for (let row = 0; row < this.gridHeight; row++) {
                    const x = line.index * this.cellSize + this.cellSize / 2;
                    const y = row * this.cellSize + this.cellSize / 2;
                    
                    // Create particle effect with slower animation
                    for (let i = 0; i < 8; i++) {
                        const particle = this.add.circle(x, y, 4, 0x32cd32);
                        
                        this.tweens.add({
                            targets: particle,
                            x: x + (Math.random() - 0.5) * 150,
                            y: y + (Math.random() - 0.5) * 150,
                            alpha: 0,
                            scale: 0,
                            duration: 1200, // Increased from 500 to 1200ms
                            delay: i * 50, // Staggered animation
                            onComplete: () => particle.destroy()
                        });
                    }
                }
            }
        });
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;
        this.linesElement.textContent = this.linesCleared;
    }
    
    startGame() {
        this.gameState = 'playing';
        this.initializeGrid();
        this.pieces = [];
        this.nextPieces = [];
        this.nextPieceId = 1;
        this.score = 20;
        this.level = 1;
        this.linesCleared = 0;
        
        // Reset piece selection and clear any highlights
        this.selectedPiece = null;
        this.isIndividualMode = false;
        this.clearSelectionHighlights();
        
        // Manual spawn mode - spawn timer not needed but kept for compatibility
        this.lastSpawnTime = 0;
        
        this.updateScore();
        
        // Generate initial next pieces
        this.generateNextPieces();
        
        if (this.gridGraphics) {
            this.renderGrid();
            // Start with one piece placed randomly
            this.spawnNextPieceRandomly();
        }
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
        }
    }
    
    resetGame() {
        this.gameState = 'waiting';
        this.initializeGrid();
        this.pieces = [];
        this.nextPieceId = 1;
        this.score = 20; // Reset to initial score
        this.level = 1;
        this.linesCleared = 0;
        
        // Reset piece selection and clear any highlights
        this.selectedPiece = null;
        this.isIndividualMode = false;
        this.clearSelectionHighlights();
        this.rectanglesCleared = 0;
        this.updateScoreDisplay();
        
        if (this.gridGraphics) {
            this.renderGrid();
        }
        
        // Start the game and show initial message
        this.gameState = 'playing';
        this.showMessage('Presiona ESPACIO para generar pieza. Las fusiones ocurren al perder focus.');
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.finalScoreElement.textContent = this.score;
        this.finalLevelElement.textContent = this.level;
        this.modal.classList.remove('hidden');
    }
}

// TetroCube Game Manager
class TetroCube {
    constructor() {
        this.config = {
            type: Phaser.AUTO,
            width: 420,  // 7 * 60 = 420px for 7x7 grid
            height: this.isMobile() ? 600 : 420, // Extra height for mobile controls
            parent: 'game-canvas-container',
            backgroundColor: '#bbada0', // 2048 background color
            scene: GameScene
        };
        
        this.game = new Phaser.Game(this.config);
        this.gameScene = null;
        
        // Wait for scene to be created
        this.game.events.once('ready', () => {
            this.gameScene = this.game.scene.getScene('GameScene');
            this.bindEvents();
        });
    }
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => {
            if (this.gameScene) this.gameScene.startGame();
        });
        
        document.getElementById('pause-btn').addEventListener('click', () => {
            if (this.gameScene) this.gameScene.pauseGame();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            if (this.gameScene) this.gameScene.resetGame();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            if (this.gameScene) {
                this.gameScene.modal.classList.add('hidden');
                this.gameScene.startGame();
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.gameScene) return;
            
            if (e.key === 'p' || e.key === 'P') {
                this.gameScene.pauseGame();
            }
        });
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TetroCube();
});