/**
 * PUZZLE O'YINI - TO'LIQ JAVASCRIPT FAYL
 * 
 * Bu fayl to'liq ishlaydigan puzzle o'yinini o'z ichiga oladi.
 * Barcha funksiyalar class strukturasida tashkil etilgan.
 */

// ===== TAYMER KLASSI =====
class GameTimer {
    constructor(displayId) {
        this.display = document.getElementById(displayId);
        this.seconds = 0;
        this.intervalId = null;
        this.isRunning = false;
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.seconds++;
            this.updateDisplay();
        }, 1000);
    }
    
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
    
    reset() {
        this.stop();
        this.seconds = 0;
        this.updateDisplay();
    }
    
    updateDisplay() {
        if (!this.display) return;
        
        const minutes = Math.floor(this.seconds / 60);
        const secs = this.seconds % 60;
        const formatted = `${minutes}:${secs.toString().padStart(2, '0')}`;
        this.display.textContent = `⏱️ ${formatted}`;
    }
    
    getTime() {
        return this.seconds;
    }
}

// ===== OVOZ MENEJERI =====
class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
    }
    
    load(name, url) {
        try {
            const audio = new Audio(url);
            audio.preload = 'auto';
            this.sounds[name] = audio;
        } catch (err) {
            console.warn(`Ovozni yuklashda xatolik: ${name}`, err);
        }
    }
    
    play(name, volume = 1.0) {
        if (!this.enabled || !this.sounds[name]) return;
        
        try {
            // Yangi Audio obyekti yaratish yoki eski ovozni to'xtatish
            const originalSound = this.sounds[name];
            const sound = new Audio(originalSound.src);
            sound.volume = Math.min(Math.max(volume, 0), 1);
            sound.play().catch(err => {
                console.log('Ovoz ijro bo\'lmadi:', err.message);
            });
        } catch (err) {
            console.warn('Ovoz ijro etishda xatolik:', err);
        }
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// ===== ASOSIY O'YIN KLASSI =====
class PuzzleGame {
    constructor(boardId, options = {}) {
        // DOM elementlar
        this.board = document.getElementById(boardId);
        if (!this.board) {
            console.error(`Board topilmadi: ${boardId}`);
            return;
        }
        
        // Sozlamalar
        this.gridSize = options.gridSize || 3;
        this.imageUrl = options.imageUrl || 'assets/images/puzzle.jpg';
        
        // O'yin holati
        this.moveCount = 0;
        this.isPlaying = false;
        this.draggedElement = null;
        this.tiles = [];
        
        // Taymer va ovoz
        this.timer = new GameTimer('timerDisplay');
        this.soundManager = new SoundManager();
        this.initSounds();
        
        // Boshlash
        this.init();
    }
    
    initSounds() {
        // Ovoz fayllarini yuklash (agar mavjud bo'lsa)
        this.soundManager.load('click', 'assets/sounds/click.wav');
        this.soundManager.load('win', 'assets/sounds/win.wav');
        this.soundManager.load('shuffle', 'assets/sounds/shuffle.wav');
    }
    
    init() {
        this.createTiles();
        this.attachEventListeners();
        this.updateDisplay();
    }
    
    createTiles() {
        // Eski kataklarni tozalash
        this.board.innerHTML = '';
        this.tiles = [];
        
        // Grid sozlash
        this.board.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        
        // Kataklarni yaratish
        const total = this.gridSize * this.gridSize;
        
        for (let i = 0; i < total; i++) {
            const tile = this.createTile(i);
            this.tiles.push(tile);
            this.board.appendChild(tile);
        }
    }
    
    createTile(index) {
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        // correctPosition - bu tile'da qaysi rasm bor (boshlang'ich holatda index bilan bir xil)
        tile.dataset.correctPosition = index.toString();
        tile.draggable = true;
        
        // Background pozitsiyasini hisoblash
        const pos = this.calculatePosition(index);
        tile.style.backgroundImage = `url('${this.imageUrl}')`;
        tile.style.backgroundPosition = `${pos.x}% ${pos.y}%`;
        tile.style.backgroundSize = `${this.gridSize * 100}%`;
        
        // Accessibility
        tile.setAttribute('tabindex', '0');
        tile.setAttribute('role', 'gridcell');
        tile.setAttribute('aria-label', `Puzzle qismi ${index + 1} / ${this.gridSize * this.gridSize}`);
        
        return tile;
    }
    
    calculatePosition(index) {
        const row = Math.floor(index / this.gridSize);
        const col = index % this.gridSize;
        
        // Foizga aylantirish
        const x = this.gridSize > 1 ? col * (100 / (this.gridSize - 1)) : 0;
        const y = this.gridSize > 1 ? row * (100 / (this.gridSize - 1)) : 0;
        
        return { x, y };
    }
    
    attachEventListeners() {
        // Drag & Drop hodisalari
        this.board.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.board.addEventListener('dragend', this.handleDragEnd.bind(this));
        this.board.addEventListener('dragover', this.handleDragOver.bind(this));
        this.board.addEventListener('drop', this.handleDrop.bind(this));
        this.board.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.board.addEventListener('dragleave', this.handleDragLeave.bind(this));
        
        // Tugmalar
        const shuffleBtn = document.getElementById('shuffleBtn');
        const restartBtn = document.getElementById('restartBtn');
        
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => this.shuffle());
        }
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restart());
        }
    }
    
    handleDragStart(e) {
        if (!e.target.classList.contains('puzzle-tile')) return;
        
        this.draggedElement = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
        
        setTimeout(() => {
            e.target.classList.add('dragging');
        }, 0);
        
        // O'yin boshlanmagan bo'lsa, boshlash
        if (!this.isPlaying) {
            this.startGame();
        }
    }
    
    handleDragEnd(e) {
        if (e.target.classList.contains('puzzle-tile')) {
            e.target.classList.remove('dragging');
        }
        this.clearDragEffects();
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }
    
    handleDragEnter(e) {
        const tile = e.target.closest('.puzzle-tile');
        if (tile && tile !== this.draggedElement) {
            tile.classList.add('drag-over');
        }
    }
    
    handleDragLeave(e) {
        const tile = e.target.closest('.puzzle-tile');
        if (tile) {
            tile.classList.remove('drag-over');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropTarget = e.target.closest('.puzzle-tile');
        
        if (!dropTarget || dropTarget === this.draggedElement) {
            return false;
        }
        
        // O'yin tugagan bo'lsa, harakatni rad etish
        if (!this.isPlaying) {
            return false;
        }
        
        // Kataklarni almashtirish
        this.swapTiles(this.draggedElement, dropTarget);
        this.incrementMoves();
        
        // G'alabani tekshirish
        setTimeout(() => {
            if (this.checkWin()) {
                this.onWin();
            }
        }, 100);
        
        return false;
    }
    
    swapTiles(tile1, tile2) {
        // Ovoz chiqarish
        this.soundManager.play('click', 0.3);
        
        // Rasmlarni almashtirish
        const tempBg = tile1.style.backgroundPosition;
        tile1.style.backgroundPosition = tile2.style.backgroundPosition;
        tile2.style.backgroundPosition = tempBg;
        
        const tempCorrect = tile1.dataset.correctPosition;
        tile1.dataset.correctPosition = tile2.dataset.correctPosition;
        tile2.dataset.correctPosition = tempCorrect;
        
        // Animatsiya
        tile1.classList.add('swapping');
        tile2.classList.add('swapping');
        
        setTimeout(() => {
            tile1.classList.remove('swapping');
            tile2.classList.remove('swapping');
        }, 300);
    }
    
    shuffle() {
        this.soundManager.play('shuffle', 0.5);
        
        const tiles = Array.from(this.board.querySelectorAll('.puzzle-tile'));
        const imageIds = tiles.map((tile) => parseInt(tile.dataset.correctPosition));
        
        // Fisher-Yates shuffle
        for (let i = imageIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [imageIds[i], imageIds[j]] = [imageIds[j], imageIds[i]];
        }
        
        // Aralashtirilgan rasmlarni qo'llash
        tiles.forEach((tile, index) => {
            const imageId = imageIds[index];
            const pos = this.calculatePosition(imageId);
            tile.style.backgroundPosition = `${pos.x}% ${pos.y}%`;
            tile.dataset.correctPosition = imageId.toString();
            tile.classList.add('shuffling');
        });
        
        setTimeout(() => {
            tiles.forEach(tile => tile.classList.remove('shuffling'));
        }, 300);
        
        // O'yinni boshlash
        this.moveCount = 0;
        this.updateDisplay();
        this.timer.reset();
        this.timer.start();
        this.isPlaying = true;
        this.closeWinMessage();
    }
    
    checkWin() {
        if (!this.isPlaying) {
            return false;
        }
        
        const tiles = this.board.querySelectorAll('.puzzle-tile');
        
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const correctPos = parseInt(tile.dataset.correctPosition);
            
            if (i !== correctPos) {
                return false;
            }
        }
        
        return true;
    }
    
    onWin() {
        if (!this.isPlaying) {
            return;
        }
        
        this.isPlaying = false;
        this.timer.stop();
        
        // Ovoz va konfetti
        this.soundManager.play('win', 0.8);
        this.createConfetti();
        
        // G'alaba xabarini ko'rsatish
        const time = this.timer.getTime();
        const moves = this.moveCount;
        this.showWinMessage(time, moves);
    }
    
    showWinMessage(time, moves) {
        this.closeWinMessage();
        
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'overlay show';
        overlay.id = 'winOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 1999;
            display: block;
            backdrop-filter: blur(4px);
        `;
        
        // Win message
        const message = document.createElement('div');
        message.className = 'win-message show';
        message.id = 'winMessage';
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(1);
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            z-index: 2000;
            min-width: 400px;
            max-width: 90%;
            animation: popIn 0.5s ease;
        `;
        message.innerHTML = `
            <div class="win-emoji" style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <h2 class="win-title" style="color: #10b981; font-size: 2rem; margin-bottom: 1rem; font-weight: 700;">
                Ajoyib! Siz Yutdingiz!
            </h2>
            <p class="win-text" style="color: #6b7280; margin-bottom: 2rem; font-size: 1.125rem;">
                ⏱️ Vaqt: ${this.formatTime(time)}<br>
                🔢 Harakatlar: ${moves}
            </p>
            <button class="btn btn-primary" style="padding: 1rem 2rem; font-size: 1.125rem;" id="playAgainBtn">
                Yana O'ynash
            </button>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(message);
        
        // Yana o'ynash tugmasi
        setTimeout(() => {
            const playAgainBtn = document.getElementById('playAgainBtn');
            if (playAgainBtn) {
                playAgainBtn.addEventListener('click', () => {
                    this.closeWinMessage();
                    this.restart();
                    setTimeout(() => this.shuffle(), 100);
                });
            }
        }, 100);
        
        // Overlay bosilganda yopish
        overlay.addEventListener('click', () => {
            this.closeWinMessage();
        });
    }
    
    closeWinMessage() {
        const overlay = document.getElementById('winOverlay');
        const message = document.getElementById('winMessage');
        
        if (overlay) overlay.remove();
        if (message) message.remove();
    }
    
    createConfetti() {
        const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            
            document.body.appendChild(confetti);
            
            // 5 soniyadan keyin olib tashlash
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }
    
    incrementMoves() {
        this.moveCount++;
        this.updateDisplay();
    }
    
    restart() {
        this.moveCount = 0;
        this.timer.reset();
        this.isPlaying = false;
        this.updateDisplay();
        this.closeWinMessage();
        
        // Kataklarni dastlabki holatiga qaytarish
        const tiles = Array.from(this.board.querySelectorAll('.puzzle-tile'));
        tiles.forEach((tile, index) => {
            tile.dataset.correctPosition = index.toString();
            const pos = this.calculatePosition(index);
            tile.style.backgroundPosition = `${pos.x}% ${pos.y}%`;
        });
    }
    
    updateDisplay() {
        const moveDisplay = document.getElementById('moveCount');
        if (moveDisplay) {
            moveDisplay.textContent = `🔢 ${this.moveCount}`;
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    clearDragEffects() {
        const tiles = this.board.querySelectorAll('.puzzle-tile');
        tiles.forEach(tile => {
            tile.classList.remove('drag-over');
        });
    }
    
    changeImage(imageUrl) {
        this.imageUrl = imageUrl;
        this.createTiles();
        this.restart();
        this.shuffle();
    }
    
    changeGridSize(size) {
        this.gridSize = size;
        this.createTiles();
        this.restart();
        this.shuffle();
    }
}

// Global o'zgaruvchi
let puzzleGame = null;

// DOM tayyor bo'lganda
document.addEventListener('DOMContentLoaded', () => {
    // O'yinni yaratish
    puzzleGame = new PuzzleGame('puzzleBoard', {
        gridSize: 3,
        imageUrl: 'assets/images/puzzle.jpg'
    });
    
    // Darhol aralashtrish
    setTimeout(() => {
        if (puzzleGame) {
            puzzleGame.shuffle();
        }
    }, 500);
});
