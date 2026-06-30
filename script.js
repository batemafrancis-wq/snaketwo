const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameOverlay = document.getElementById("gameOverlay");
const overlayText = document.getElementById("overlayText");
const actionBtn = document.getElementById("actionBtn");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Score & Color inputs
const p1ScoreEl = document.getElementById("p1-score");
const p2ScoreEl = document.getElementById("p2-score");
const p1WinsEl = document.getElementById("p1-wins");
const p2WinsEl = document.getElementById("p2-wins");
const p1ColorPicker = document.getElementById("p1-color-picker");
const p2ColorPicker = document.getElementById("p2-color-picker");

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE; 

let gameInterval = null;
let gameSpeed = parseInt(localStorage.getItem("snake_speed")) || 100;
let isGameRunning = false;

let food;
let snake1, snake2;
let dir1, dir2;
let nextDir1, nextDir2; 

// Track wins via cache persistence
let wins = { p1: parseInt(localStorage.getItem("w_p1")) || 0, p2: parseInt(localStorage.getItem("w_p2")) || 0 };

const defaultKeys = {
    p1: { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" },
    p2: { up: "w", down: "s", left: "a", right: "d" }
};

let keys = JSON.parse(localStorage.getItem("snake_keys")) || defaultKeys;
let activeBinderButton = null;

// Dynamic Badge Styling Helper
function updateBadgeColors() {
    document.querySelector(".p1-badge").style.backgroundColor = p1ColorPicker.value;
    document.querySelector(".p2-badge").style.backgroundColor = p2ColorPicker.value;
    document.querySelectorAll(".text-p1").forEach(el => el.style.color = p1ColorPicker.value);
    document.querySelectorAll(".text-p2").forEach(el => el.style.color = p2ColorPicker.value);
}

function updateControlUI() {
    Object.keys(keys).forEach(player => {
        Object.keys(keys[player]).forEach(direction => {
            const btn = document.getElementById(`${player}-${direction}`);
            if (btn) btn.innerText = keys[player][direction] === " " ? "Space" : keys[player][direction];
        });
    });
}

// Map Remap Interaction Event Click Rules
document.querySelectorAll(".key-binder").forEach(button => {
    button.addEventListener("click", (e) => {
        if (activeBinderButton) activeBinderButton.classList.remove("listening");
        activeBinderButton = e.target;
        activeBinderButton.classList.add("listening");
        activeBinderButton.innerText = "Press key...";
    });
});

window.addEventListener("keydown", e => {
    if (activeBinderButton) {
        e.preventDefault();
        const [player, direction] = activeBinderButton.id.split("-");
        keys[player][direction] = e.key.toLowerCase();
        localStorage.setItem("snake_keys", JSON.stringify(keys));
        
        updateControlUI();
        activeBinderButton.classList.remove("listening");
        activeBinderButton = null;
        return;
    }

    const pressedKey = e.key.toLowerCase();

    // Player 1 input matching
    if ((pressedKey === keys.p1.up) && dir1.y === 0) nextDir1 = {x: 0, y: -1};
    if ((pressedKey === keys.p1.down) && dir1.y === 0) nextDir1 = {x: 0, y: 1};
    if ((pressedKey === keys.p1.left) && dir1.x === 0) nextDir1 = {x: -1, y: 0};
    if ((pressedKey === keys.p1.right) && dir1.x === 0) nextDir1 = {x: 1, y: 0};

    // Player 2 input matching
    if ((pressedKey === keys.p2.up) && dir2.y === 0) nextDir2 = {x: 0, y: -1};
    if ((pressedKey === keys.p2.down) && dir2.y === 0) nextDir2 = {x: 0, y: 1};
    if ((pressedKey === keys.p2.left) && dir2.x === 0) nextDir2 = {x: -1, y: 0};
    if ((pressedKey === keys.p2.right) && dir2.x === 0) nextDir2 = {x: 1, y: 0};
});

speedSlider.addEventListener("input", (e) => {
    gameSpeed = parseInt(e.target.value);
    speedValue.innerText = `${gameSpeed}ms`;
    localStorage.setItem("snake_speed", gameSpeed);
    if (isGameRunning) {
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, gameSpeed);
    }
});

p1ColorPicker.addEventListener("input", () => {
    localStorage.setItem("snake_p1_col", p1ColorPicker.value);
    updateBadgeColors();
    draw();
});
p2ColorPicker.addEventListener("input", () => {
    localStorage.setItem("snake_p2_col", p2ColorPicker.value);
    updateBadgeColors();
    draw();
});

clearHistoryBtn.addEventListener("click", () => {
    wins = { p1: 0, p2: 0 };
    localStorage.setItem("w_p1", 0);
    localStorage.setItem("w_p2", 0);
    p1WinsEl.innerText = 0;
    p2WinsEl.innerText = 0;
});

function initConfigSettings() {
    p1ColorPicker.value = localStorage.getItem("snake_p1_col") || "#10b981";
    p2ColorPicker.value = localStorage.getItem("snake_p2_col") || "#3b82f6";
    
    speedSlider.value = gameSpeed;
    speedValue.innerText = `${gameSpeed}ms`;

    p1WinsEl.innerText = wins.p1;
    p2WinsEl.innerText = wins.p2;

    updateControlUI();
    updateBadgeColors();
    draw();
}

function startMatchExecution() {
    gameOverlay.classList.add("hidden");
    isGameRunning = true;
    
    // Crucial Engine Fix: Initial head indices mapped accurately via array index brackets [0]
    snake1 = [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}];
    dir1 = {x: 1, y: 0}; nextDir1 = {x: 1, y: 0};

    snake2 = [{x: 24, y: 24}, {x: 25, y: 24}, {x: 26, y: 24}];
    dir2 = {x: -1, y: 0}; nextDir2 = {x: -1, y: 0};

    p1ScoreEl.innerText = snake1.length;
    p2ScoreEl.innerText = snake2.length;

    spawnFood();
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed); 
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
    if (isOnSnake(food, snake1) || isOnSnake(food, snake2)) {
        spawnFood();
    }
}

function isOnSnake(pos, snake) {
    return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}

function gameLoop() {
    dir1 = nextDir1;
    dir2 = nextDir2;

    // Fixed array reference syntax parsing bugs safely
    const head1 = {x: snake1[0].x + dir1.x, y: snake1[0].y + dir1.y};
    const head2 = {x: snake2[0].x + dir2.x, y: snake2[0].y + dir2.y};

    let p1Ate = (head1.x === food.x && head1.y === food.y);
    let p2Ate = (head2.x === food.x && head2.y === food.y);

    snake1.unshift(head1);
    if (!p1Ate) snake1.pop(); else p1ScoreEl.innerText = snake1.length;

    snake2.unshift(head2);
    if (!p2Ate) snake2.pop(); else p2ScoreEl.innerText = snake2.length;

    if (p1Ate || p2Ate) spawnFood();

    // Pass-through check rules modification: only checking edge constraints & self-collisions
    let p1Dead = checkSelfAndEdgeCollision(snake1);
    let p2Dead = checkSelfAndEdgeCollision(snake2);

    if (p1Dead || p2Dead) {
        terminateGame(p1Dead, p2Dead);
        return;
    }

    draw();
}

function checkSelfAndEdgeCollision(snake) {
    const head = snake[0];
    // Wall limits lethal check
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) return true;
    // Self execution bite check ONLY (skipping index 0 header segment element)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

function terminateGame(p1Dead, p2Dead) {
    clearInterval(gameInterval);
    isGameRunning = false;
    
    gameOverlay.classList.remove("hidden");
    actionBtn.innerText = "Execute Rematch";
    
    if (p1Dead && p2Dead) {
        overlayText.innerText = "Mutual Destruction!";
    } else if (p1Dead) {
        overlayText.innerText = "Player 2 Dominates!";
        wins.p2++;
        localStorage.setItem("w_p2", wins.p2);
        p2WinsEl.innerText = wins.p2;
    } else {
        overlayText.innerText = "Player 1 Dominates!";
        wins.p1++;
        localStorage.setItem("w_p1", wins.p1);
        p1WinsEl.innerText = wins.p1;
    }
}

function draw() {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--canvas-bg").trim();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Food Render
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--food-color").trim();
    ctx.fillRect(food ? food.x * GRID_SIZE + 1 : 0, food ? food.y * GRID_SIZE + 1 : 0, GRID_SIZE - 2, GRID_SIZE - 2);

    // Dynamic Engine render fetches values actively assigned in color elements
    if (snake1) {
        ctx.fillStyle = p1ColorPicker.value;
        snake1.forEach(seg => ctx.fillRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2));
    }

    if (snake2) {
        ctx.fillStyle = p2ColorPicker.value;
        snake2.forEach(seg => ctx.fillRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2));
    }
}

actionBtn.addEventListener("click", startMatchExecution);

// Bootstrap
initConfigSettings();
