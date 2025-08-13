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
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        
        // Piece selection system
        this.selectedPiece = null; // Currently selected piece
        this.isIndividualMode = false; // True when a piece is selected
        
        // Next pieces system
        this.nextPieces = []; // Array of next 2 pieces
        
        // UI elements
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.linesElement = document.getElementById('lines');
        this.modal = document.getElementById('game-over-modal');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalLevelElement = document.getElementById('final-level');
        
        // Proper Tetris pieces for 7x7 grid with 2048-style colors
        this.pieceTemplates = {
            I: { shape: [[1,1,1,1]], color: 0xeee4da, textColor: 0x776e65 }, // Light beige like 2
            O: { shape: [[1,1],[1,1]], color: 0xede0c8, textColor: 0x776e65 }, // Slightly darker beige like 4
            T: { shape: [[0,1,0],[1,1,1]], color: 0xf2b179, textColor: 0xf9f6f2 }, // Orange like 8
            S: { shape: [[0,1,1],[1,1,0]], color: 0xf59563, textColor: 0xf9f6f2 }, // Darker orange like 16
            Z: { shape: [[1,1,0],[0,1,1]], color: 0xf67c5f, textColor: 0xf9f6f2 }, // Red-orange like 32
            L: { shape: [[1,0,0],[1,1,1]], color: 0xf65e3b, textColor: 0xf9f6f2 }, // Red like 64
            J: { shape: [[0,0,1],[1,1,1]], color: 0xedcf72, textColor: 0xf9f6f2 }, // Yellow like 128
            // Additional pieces for 7x7 grid
            I3: { shape: [[1,1,1]], color: 0xedcc61, textColor: 0xf9f6f2 }, // Darker yellow like 256
            L2: { shape: [[1,0],[1,1]], color: 0xedc850, textColor: 0xf9f6f2 }, // Gold like 512
            // Single blocks for easier gameplay
            SINGLE: { shape: [[1]], color: 0xedc53f, textColor: 0xf9f6f2 } // Bright gold like 1024
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
        
        // Create fragment tile texture (same as single block but with "FRAG" label)
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
        
        // Render the grid initially
        this.renderGrid();
        
        // Start the game
        this.gameState = 'playing';
        
        // Spawn initial pieces for testing merging
        this.spawnTestPieces();
        
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
        console.log(`Individual mode activated for piece ${piece.type}`);
    }
    
    deselectPiece() {
        if (this.selectedPiece) {
            console.log(`Deselecting piece ${this.selectedPiece.type}`);
            this.selectedPiece = null;
            this.isIndividualMode = false;
            this.clearSelectionHighlights(); // Clear selection borders
            console.log('All pieces mode activated');
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
                
                const border = this.add.rectangle(x + this.cellSize/2, y + this.cellSize/2, 
                    this.cellSize - 2, this.cellSize - 2);
                border.setStrokeStyle(4, 0xffff00); // Yellow border
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
    
    update(time, delta) {
        if (this.gameState !== 'playing') return;
        
        this.handleInput();
        
        // Auto-spawn system removed - pieces now spawn only when user presses SPACE
    }
    
    // Add new method to spawn pieces manually
    spawnNewPiece() {
        console.log('Space pressed - spawning new piece manually');
        this.spawnNextPieceRandomly();
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
        // Handle directional input - move selected piece or all pieces
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            if (this.isIndividualMode && this.selectedPiece) {
                console.log('Left arrow pressed, moving selected piece left');
                this.moveSelectedPiece(-1, 0);
            } else {
                console.log('Left arrow pressed, moving all pieces left');
                this.moveAllPieces(-1, 0);
            }
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            if (this.isIndividualMode && this.selectedPiece) {
                console.log('Right arrow pressed, moving selected piece right');
                this.moveSelectedPiece(1, 0);
            } else {
                console.log('Right arrow pressed, moving all pieces right');
                this.moveAllPieces(1, 0);
            }
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            if (this.isIndividualMode && this.selectedPiece) {
                console.log('Down arrow pressed, moving selected piece down');
                this.moveSelectedPiece(0, 1);
            } else {
                console.log('Down arrow pressed, moving all pieces down');
                this.moveAllPieces(0, 1);
            }
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            if (this.isIndividualMode && this.selectedPiece) {
                console.log('Up arrow pressed, moving selected piece up');
                this.moveSelectedPiece(0, -1);
            } else {
                console.log('Up arrow pressed, moving all pieces up');
                this.moveAllPieces(0, -1);
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
    
    moveAllPieces(deltaX, deltaY) {
        console.log(`Moving all pieces by deltaX: ${deltaX}, deltaY: ${deltaY}`);
        
        if (this.pieces.length === 0) {
            console.log('No pieces to move');
            return;
        }
        
        let hasMoved = false;
        
        // Sort pieces by movement direction to avoid conflicts
        const sortedPieces = [...this.pieces];
        if (deltaX > 0) { // Moving right
            sortedPieces.sort((a, b) => b.x - a.x);
        } else if (deltaX < 0) { // Moving left
            sortedPieces.sort((a, b) => a.x - b.x);
        } else if (deltaY > 0) { // Moving down
            sortedPieces.sort((a, b) => b.y - a.y);
        } else if (deltaY < 0) { // Moving up
            sortedPieces.sort((a, b) => a.y - b.y);
        }
        
        // Clear all pieces from grid first
        this.pieces.forEach(piece => {
            this.removePieceFromGrid(piece);
        });
        
        // Move each piece as far as possible
        for (let piece of sortedPieces) {
            const originalX = piece.x;
            const originalY = piece.y;
            
            // Find the furthest valid position
            let newX = piece.x;
            let newY = piece.y;
            
            while (true) {
                const testX = newX + deltaX;
                const testY = newY + deltaY;
                
                if (this.canPlacePieceAt(piece, testX, testY)) {
                    newX = testX;
                    newY = testY;
                } else {
                    break;
                }
            }
            
            // Update piece position
            piece.x = newX;
            piece.y = newY;
            
            // Place the piece back on the grid immediately
            this.placePieceOnGrid(piece);
            
            if (originalX !== newX || originalY !== newY) {
                hasMoved = true;
                console.log(`Moved piece ${piece.id} from (${originalX}, ${originalY}) to (${newX}, ${newY})`);
            }
        }
        
        console.log(`Has moved: ${hasMoved}`);
        
        if (hasMoved) {
            this.renderGrid();
            this.checkAndClearRectangles();
            
            // Check for piece merging after movement
            this.checkAndMergeSameColorPieces();
            
            // Validate game state after movement
            this.validateGameState();
            
            // Note: New pieces will spawn automatically via the update loop
        } else {
            // Even if nothing moved, make sure grid is properly rendered
            this.renderGrid();
        }
    }
    
    moveSelectedPiece(deltaX, deltaY) {
        if (!this.selectedPiece) return;
        
        console.log(`Moving selected piece ${this.selectedPiece.id} by deltaX: ${deltaX}, deltaY: ${deltaY}`);
        
        // Clear the selected piece from grid
        this.clearPieceFromGrid(this.selectedPiece);
        
        const originalX = this.selectedPiece.x;
        const originalY = this.selectedPiece.y;
        
        // Find the furthest valid position
        let newX = this.selectedPiece.x;
        let newY = this.selectedPiece.y;
        
        while (true) {
            const testX = newX + deltaX;
            const testY = newY + deltaY;
            
            if (this.canPlacePieceAt(this.selectedPiece, testX, testY)) {
                newX = testX;
                newY = testY;
            } else {
                break;
            }
        }
        
        // Remove piece from its current position first
        this.removePieceFromGrid(this.selectedPiece);
        
        // Update piece position
        this.selectedPiece.x = newX;
        this.selectedPiece.y = newY;
        
        // Place the piece back on the grid
        this.placePieceOnGrid(this.selectedPiece);
        
        const hasMoved = (originalX !== newX || originalY !== newY);
        
        if (hasMoved) {
            console.log(`Moved selected piece ${this.selectedPiece.id} from (${originalX}, ${originalY}) to (${newX}, ${newY})`);
            this.checkAndClearRectangles();
            
            // Check for piece merging after individual movement
            this.checkAndMergeSameColorPieces();
            
            // Validate game state after individual movement
            this.validateGameState();
            
            // After individual piece movement, deselect and return to group mode
            this.deselectPiece();
            
            // Note: New pieces will spawn automatically via the update loop
        } else {
            // Even if nothing moved, maintain highlighting
            this.highlightSelectedPiece();
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
    
    checkAndMergeSameColorPieces() {
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
            
            // Process each merge group
            mergeGroups.forEach((group, index) => {
                console.log(`🔥 MERGING group ${index + 1}: ${group.length} pieces of color ${group[0].color.toString(16)}`);
                group.forEach(p => console.log(`   - ${p.type}(${p.id}) at (${p.x},${p.y})`));
                
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
                
                console.log(`✅ Created merged piece ${mergedPiece.id} with ${mergedPiece.cells.length} cells`);
            });
            
            hasMerged = true;
            this.renderGrid();
        }
        
        if (hasMerged) {
            console.log(`✅ Merging complete. Final pieces: ${this.pieces.length}`);
            this.pieces.forEach(p => console.log(`  - ${p.type}(${p.id}) at (${p.x},${p.y}) color:${p.color.toString(16)}`));
        } else {
            console.log('❌ No pieces to merge found');
        }
        
        console.log('=== End piece merging check ===');
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
    
    rotatePiece() {
        // Rotate functionality can be added later if needed
        // For now, just a placeholder
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
            
            // Validate game state after spawning
            this.validateGameState();
            
            // Check for piece merging after spawning
            this.checkAndMergeSameColorPieces();
            
            // Check for completed lines immediately after placing the piece
            console.log('Checking for completed lines after piece placement...');
            this.checkAndClearRectangles();
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
                        cell.setTexture('tile_FRAGMENT');
                    } else {
                        cell.setTexture(`tile_${piece.type}`);
                    }
                    // Apply color tint to match piece color (for fragments especially)
                    if (piece.type === 'FRAGMENT') {
                        cell.setTint(piece.color);
                    } else {
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
    
    checkAndClearRectangles() {
        console.log('=== Checking for complete lines ===');
        
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
                this.score += totalCells * 100 * this.level;
                this.linesCleared += linesToClear.length;
                
                // Level up every 5 lines cleared
                if (Math.floor(this.linesCleared / 5) + 1 > this.level) {
                    this.level++;
                }
                
                this.updateScore();
                
                // Create particle effect
                this.createClearEffect(linesToClear);
                
                // Check for more lines after clearing (chain reactions) with longer delay
                setTimeout(() => this.checkAndClearRectangles(), 1500); // Increased from 500 to 1500ms
            });
        } else {
            console.log('No complete lines found');
            // No lines to clear, make sure grid is properly rendered
            this.renderGrid();
        }
        
        console.log('=== Line check complete ===');
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
        console.log('Starting line completion animation...');
        
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
                            originalAlpha: cell.alpha
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
                            originalAlpha: cell.alpha
                        });
                        animationCells.push(cell);
                    }
                }
            }
        });
        
        // Create flashing animation with color changes
        let flashCount = 0;
        const maxFlashes = 6; // Number of flashes
        const flashDuration = 200; // Duration of each flash
        
        const flashInterval = setInterval(() => {
            const colors = [0xFFFFFF, 0xFFFF00, 0xFF0000, 0x00FF00, 0x0000FF, 0xFF00FF]; // White, Yellow, Red, Green, Blue, Magenta
            const currentColor = colors[flashCount % colors.length];
            
            animationCells.forEach(cell => {
                if (flashCount % 2 === 0) {
                    // Flash with color
                    cell.setTint(currentColor);
                    cell.setAlpha(1);
                } else {
                    // Return to slightly dimmed original
                    cell.clearTint();
                    cell.setAlpha(0.7);
                }
            });
            
            flashCount++;
            
            if (flashCount >= maxFlashes) {
                clearInterval(flashInterval);
                
                // Restore original appearances briefly
                originalCells.forEach(data => {
                    data.cell.setTexture(data.originalTexture);
                    data.cell.setTint(data.originalTint);
                    data.cell.setAlpha(data.originalAlpha);
                });
                
                // Wait a moment then call the completion callback
                setTimeout(() => {
                    console.log('Line completion animation finished');
                    onComplete();
                }, 300);
            }
        }, flashDuration);
    }
    
    clearLines(lines) {
        const clearedCells = new Set();
        
        // Mark all cells in complete lines to be cleared
        lines.forEach(line => {
            if (line.type === 'row') {
                // Clear entire row
                for (let col = 0; col < this.gridWidth; col++) {
                    const key = `${line.index},${col}`;
                    clearedCells.add(key);
                    this.grid[line.index][col] = 0;
                }
            } else if (line.type === 'col') {
                // Clear entire column
                for (let row = 0; row < this.gridHeight; row++) {
                    const key = `${row},${line.index}`;
                    clearedCells.add(key);
                    this.grid[row][line.index] = 0;
                }
            }
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
        this.score = 0;
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
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        
        // Reset piece selection and clear any highlights
        this.selectedPiece = null;
        this.isIndividualMode = false;
        this.clearSelectionHighlights();
        this.rectanglesCleared = 0;
        this.updateScore();
        
        if (this.gridGraphics) {
            this.renderGrid();
        }
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
            height: 420, // 7 * 60 = 420px for 7x7 grid  
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