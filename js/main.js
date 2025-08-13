// TetroCube Game - 6x6 Grid with Movable Tetris Pieces
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }
    
    init() {
        // Game state
        this.gridWidth = 8;
        this.gridHeight = 8;
        this.cellSize = 52; // Adjusted for 8x8 grid
        this.grid = [];
        this.pieces = []; // Array to store active pieces with their positions
        this.nextPieceId = 1; // ID counter for pieces
        this.gameState = 'waiting'; // waiting, playing, paused, gameOver
        this.score = 0;
        this.level = 1;
        this.rectanglesCleared = 0;
        
        // Auto-spawn timer for increased difficulty
        this.autoSpawnTimer = 0;
        this.autoSpawnInterval = 8000; // Spawn every 8 seconds initially
        this.lastAutoSpawn = 0;
        
        // UI elements
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.linesElement = document.getElementById('lines');
        this.modal = document.getElementById('game-over-modal');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalLevelElement = document.getElementById('final-level');
        
        // Proper Tetris pieces for 10x10 grid
        this.pieceTemplates = {
            I: { shape: [[1,1,1,1]], color: 0x00ffff }, // Line piece
            O: { shape: [[1,1],[1,1]], color: 0xffff00 }, // Square piece
            T: { shape: [[0,1,0],[1,1,1]], color: 0xff00ff }, // T piece
            S: { shape: [[0,1,1],[1,1,0]], color: 0x00ff00 }, // S piece
            Z: { shape: [[1,1,0],[0,1,1]], color: 0xff0000 }, // Z piece
            L: { shape: [[1,0,0],[1,1,1]], color: 0xffa500 }, // L piece
            J: { shape: [[0,0,1],[1,1,1]], color: 0x0000ff }, // J piece
            // Additional pieces for 10x10 grid
            I3: { shape: [[1,1,1]], color: 0x88ffff }, // 3-block line
            L2: { shape: [[1,0],[1,1]], color: 0xffaa00 }, // Small L
            // Single blocks for easier gameplay
            SINGLE: { shape: [[1]], color: 0xff6b6b }
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
        
        // Create colored rectangles for tetris blocks
        Object.values(this.pieceTemplates).forEach((piece, index) => {
            this.add.graphics()
                .fillStyle(piece.color)
                .fillRect(0, 0, this.cellSize, this.cellSize)
                .generateTexture(`block_${index}`, this.cellSize, this.cellSize);
        });
        
        // Create empty grid cell texture with background color
        this.add.graphics()
            .fillStyle(0x1a1a2e) // Dark blue background
            .fillRect(0, 0, this.cellSize, this.cellSize)
            .lineStyle(2, 0x333333) // Border
            .strokeRect(0, 0, this.cellSize, this.cellSize)
            .generateTexture('empty_cell', this.cellSize, this.cellSize);
        
        // Create grid visual
        this.gridGraphics = this.add.group();
        this.createGridVisual();
        
        // Create current piece group (not used but kept for compatibility)
        this.currentPieceGroup = this.add.group();
        
        // Input handling
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-SPACE', this.rotatePiece.bind(this));
        
        // Render the grid initially
        this.renderGrid();
    }
    
    createGridVisual() {
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const x = col * this.cellSize + this.cellSize / 2;
                const y = row * this.cellSize + this.cellSize / 2;
                const cell = this.add.image(x, y, 'empty_cell');
                cell.setData('row', row);
                cell.setData('col', col);
                this.gridGraphics.add(cell);
            }
        }
    }
    
    update(time, delta) {
        if (this.gameState !== 'playing') return;
        
        this.handleInput();
        
        // Auto-spawn pieces for increased difficulty
        if (time - this.lastAutoSpawn > this.autoSpawnInterval) {
            console.log('Auto-spawning piece due to timer');
            this.spawnRandomPiece();
            this.lastAutoSpawn = time;
            
            // Decrease interval as level increases (gets faster)
            this.autoSpawnInterval = Math.max(4000, 8000 - (this.level * 500));
        }
    }
    
    handleInput() {
        // Handle directional input to move ALL pieces
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            console.log('Left arrow pressed, moving all pieces left');
            this.moveAllPieces(-1, 0);
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            console.log('Right arrow pressed, moving all pieces right');
            this.moveAllPieces(1, 0);
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            console.log('Down arrow pressed, moving all pieces down');
            this.moveAllPieces(0, 1);
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            console.log('Up arrow pressed, moving all pieces up');
            this.moveAllPieces(0, -1);
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
            this.clearPieceFromGrid(piece);
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
            
            // After movement, spawn a new piece
            setTimeout(() => {
                this.spawnRandomPiece();
            }, 300);
        } else {
            // Even if nothing moved, make sure grid is properly rendered
            this.renderGrid();
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
            // For regular pieces, use template
            const template = this.pieceTemplates[piece.type];
            if (template) {
                for (let row = 0; row < template.shape.length; row++) {
                    for (let col = 0; col < template.shape[row].length; col++) {
                        if (template.shape[row][col]) {
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
            // For regular pieces, use template
            const template = this.pieceTemplates[piece.type];
            if (template) {
                for (let row = 0; row < template.shape.length; row++) {
                    for (let col = 0; col < template.shape[row].length; col++) {
                        if (template.shape[row][col]) {
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
            // For regular pieces, use template
            const template = this.pieceTemplates[piece.type];
            if (template) {
                for (let row = 0; row < template.shape.length; row++) {
                    for (let col = 0; col < template.shape[row].length; col++) {
                        if (template.shape[row][col]) {
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
        }
        return true;
    }
    
    spawnPieceInCenter() {
        const centerX = Math.floor(this.gridWidth / 2);
        const centerY = Math.floor(this.gridHeight / 2);
        
        // Start with a simple piece (T or L piece work well)
        const startingPieces = ['T', 'L', 'SINGLE'];
        const type = startingPieces[Math.floor(Math.random() * startingPieces.length)];
        const template = this.pieceTemplates[type];
        
        console.log(`Spawning initial ${type} piece in center`);
        
        // Calculate centered position
        const x = centerX - Math.floor(template.shape[0].length / 2);
        const y = centerY - Math.floor(template.shape.length / 2);
        
        // Create piece object
        const piece = {
            id: this.nextPieceId++,
            type: type,
            x: x,
            y: y,
            color: template.color
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
        
        const template = this.pieceTemplates[type];
        
        // Try to find a valid position for this piece
        const validPositions = [];
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const piece = {
                    id: this.nextPieceId,
                    type: type,
                    x: col,
                    y: row,
                    color: template.color
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
                color: template.color
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
            const template = this.pieceTemplates[type];
            
            for (let row = 0; row < this.gridHeight; row++) {
                for (let col = 0; col < this.gridWidth; col++) {
                    const piece = {
                        id: this.nextPieceId,
                        type: type,
                        x: col,
                        y: row,
                        color: template.color
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
                    // Cell has a piece - use piece color
                    cell.setTint(piece.color);
                    cell.setAlpha(1);
                } else {
                    // Fallback if piece not found - this shouldn't happen
                    console.warn(`Piece with ID ${pieceId} not found for cell (${row}, ${col})`);
                    cell.setTint(0xffffff);
                    cell.setAlpha(1);
                }
            } else {
                // Empty cell - use default texture
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
        const rectanglesToClear = this.findRectangles();
        
        if (rectanglesToClear.length > 0) {
            console.log(`Found ${rectanglesToClear.length} rectangles to clear (4x2+ minimum - HARD MODE)`);
            
            // Remove rectangles from pieces and grid
            this.clearRectangles(rectanglesToClear);
            
            // After clearing, check for disconnected pieces and split them
            this.splitDisconnectedPieces();
            
            this.renderGrid();
            
            // Update score and level
            const totalCells = rectanglesToClear.reduce((sum, rect) => sum + rect.cells.length, 0);
            this.score += totalCells * 100 * this.level;
            this.rectanglesCleared += rectanglesToClear.length;
            
            // Level up every 5 rectangles cleared
            if (Math.floor(this.rectanglesCleared / 5) + 1 > this.level) {
                this.level++;
            }
            
            this.updateScore();
            
            // Create particle effect
            this.createClearEffect(rectanglesToClear);
            
            // Check for more rectangles after clearing (chain reactions)
            setTimeout(() => this.checkAndClearRectangles(), 500);
        }
    }
    
    findRectangles() {
        const visited = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(false));
        const rectangles = [];
        
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.grid[row][col] && !visited[row][col]) {
                    const rectangle = this.findRectangleFrom(row, col, visited);
                    if (rectangle && this.isValidRectangle(rectangle)) {
                        rectangles.push(rectangle);
                    }
                }
            }
        }
        
        return rectangles;
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
            // For regular pieces, use template
            const template = this.pieceTemplates[piece.type];
            if (template) {
                for (let row = 0; row < template.shape.length; row++) {
                    for (let col = 0; col < template.shape[row].length; col++) {
                        if (template.shape[row][col]) {
                            cells.push({
                                row: piece.y + row,
                                col: piece.x + col
                            });
                        }
                    }
                }
            }
        }
        
        return cells;
    }
    
    // Remove gravity - pieces stay where they are placed
    // applyGravity() method removed
    
    createClearEffect(rectangles) {
        if (!this.add || !this.tweens) return;
        
        rectangles.forEach(rectangle => {
            rectangle.cells.forEach(cell => {
                const x = cell.col * this.cellSize + this.cellSize / 2;
                const y = cell.row * this.cellSize + this.cellSize / 2;
                
                // Create particle effect
                for (let i = 0; i < 5; i++) {
                    const particle = this.add.circle(x, y, 3, 0xffff00);
                    
                    this.tweens.add({
                        targets: particle,
                        x: x + (Math.random() - 0.5) * 100,
                        y: y + (Math.random() - 0.5) * 100,
                        alpha: 0,
                        scale: 0,
                        duration: 500,
                        onComplete: () => particle.destroy()
                    });
                }
            });
        });
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;
        this.linesElement.textContent = this.rectanglesCleared;
    }
    
    startGame() {
        this.gameState = 'playing';
        this.initializeGrid();
        this.pieces = [];
        this.nextPieceId = 1;
        this.score = 0;
        this.level = 1;
        this.rectanglesCleared = 0;
        this.lastAutoSpawn = 0; // Reset auto-spawn timer
        this.autoSpawnInterval = 8000; // Reset interval
        this.updateScore();
        
        if (this.gridGraphics) {
            this.renderGrid();
            // Start with one piece in the center
            this.spawnPieceInCenter();
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
            width: 420,
            height: 420, // Square for 10x10 grid
            parent: 'game-canvas-container',
            backgroundColor: '#0f0f23',
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