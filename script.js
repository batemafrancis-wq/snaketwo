const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameOverlay = document.getElementById("gameOverlay");
const overlayText = document.getElementById("overlayText");
const actionBtn = document.getElementById("actionBtn");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const playerCountSelect = document.getElementById("playerCount");
const goalInput = document.getElementById("goalInput");

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const playerIds = ["p1", "p2", "p3", "p4"];

const defaultColors = {
    p1: "#10b981",
    p2: "#3b82f6",
    p3: "#f59e0b",
    p4: "#ef4444"
};

const defaultKeys = {
    p1: { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" },
    p2: { up: "w", down: "s", left: "a", right: "d" },
    p3: { up: "i", down: "k", left: "j", right: "l" },
    p4: { up: "t", down: "g", left: "f", right: "h" }
};

const spawnConfig = {
    p1: { x: 3, y: 3, dir: { x: 1, y: 0 } },
    p2: { x: 16, y: 3, dir: { x: -1, y: 0 } },
    p3: { x: 3, y: 16, dir: { x: 1, y: 0 } },
    p4: { x: 16, y: 16, dir: { x: -1, y: 0 } }
};

const playerNames = {
    p1: "Player One",
    p2: "Player Two",
    p3: "Player Three",
    p4: "Player Four"
};

let gameInterval = null;
let gameSpeed = parseInt(localStorage.getItem("snake_speed")) || 100;
let isGameRunning = false;
let food = null;
let goalCount = parseInt(localStorage.getItem("snake_goal")) || 10;
let activePlayerCount = parseInt(localStorage.getItem("snake_player_count")) || 4;
let playerStates = {};
let activeBinderButton = null;

let wins = {};
playerIds.forEach((playerId) => {
    wins[playerId] = parseInt(localStorage.getItem(`w_${playerId}`)) || 0;
});

let keys = JSON.parse(localStorage.getItem("snake_keys")) || {};
keys = {
    p1: { ...defaultKeys.p1, ...(keys.p1 || {}) },
    p2: { ...defaultKeys.p2, ...(keys.p2 || {}) },
    p3: { ...defaultKeys.p3, ...(keys.p3 || {}) },
    p4: { ...defaultKeys.p4, ...(keys.p4 || {}) }
};

function initPlayerStates() {
    playerIds.forEach((playerId) => {
        const colorPicker = document.getElementById(`${playerId}-color-picker`);
        const scoreEl = document.getElementById(`${playerId}-score`);
        const winsEl = document.getElementById(`${playerId}-wins`);
        const badge = document.getElementById(`${playerId}-badge`);
        const panel = document.querySelector(`.${playerId}-panel`);
        const storedColor = localStorage.getItem(`snake_${playerId}_col`) || defaultColors[playerId];

        colorPicker.value = storedColor;
        playerStates[playerId] = {
            snake: [],
            dir: { x: 0, y: 0 },
            nextDir: { x: 0, y: 0 },
            eaten: 0,
            scoreEl,
            winsEl,
            colorPicker,
            badge,
            panel
        };
    });
}

function updateBadgeColors() {
    playerIds.forEach((playerId) => {
        const color = playerStates[playerId].colorPicker.value;
        const badge = document.getElementById(`${playerId}-badge`);
        if (badge) badge.style.backgroundColor = color;
        document.querySelectorAll(`.text-${playerId}`).forEach((el) => {
            el.style.color = color;
        });
    });
}

function updatePlayerPanels() {
    playerIds.forEach((playerId, index) => {
        const panel = playerStates[playerId].panel;
        if (panel) panel.classList.toggle("is-active", index < activePlayerCount);
    });
}

function updateControlUI() {
    playerIds.forEach((playerId) => {
        Object.keys(keys[playerId]).forEach((direction) => {
            const btn = document.getElementById(`${playerId}-${direction}`);
            if (btn) {
                const displayValue = keys[playerId][direction] === " " ? "Space" : keys[playerId][direction].toUpperCase();
                btn.innerText = displayValue;
            }
        });
    });
}

document.querySelectorAll(".key-binder").forEach((button) => {
    button.addEventListener("click", (e) => {
        if (activeBinderButton) activeBinderButton.classList.remove("listening");
        activeBinderButton = e.target;
        activeBinderButton.classList.add("listening");
        activeBinderButton.innerText = "Press key...";
    });
});

window.addEventListener("keydown", (e) => {
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

    playerIds.slice(0, activePlayerCount).forEach((playerId) => {
        const state = playerStates[playerId];
        if (pressedKey === keys[playerId].up && state.dir.y === 0) state.nextDir = { x: 0, y: -1 };
        if (pressedKey === keys[playerId].down && state.dir.y === 0) state.nextDir = { x: 0, y: 1 };
        if (pressedKey === keys[playerId].left && state.dir.x === 0) state.nextDir = { x: -1, y: 0 };
        if (pressedKey === keys[playerId].right && state.dir.x === 0) state.nextDir = { x: 1, y: 0 };
    });
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

playerIds.forEach((playerId) => {
    const colorPicker = document.getElementById(`${playerId}-color-picker`);
    colorPicker.addEventListener("input", () => {
        localStorage.setItem(`snake_${playerId}_col`, colorPicker.value);
        updateBadgeColors();
        draw();
    });
});

playerCountSelect.addEventListener("change", () => {
    activePlayerCount = parseInt(playerCountSelect.value) || 2;
    localStorage.setItem("snake_player_count", activePlayerCount);
    updatePlayerPanels();
    if (!isGameRunning) draw();
});

goalInput.addEventListener("change", () => {
    goalCount = Math.max(1, parseInt(goalInput.value) || 10);
    goalInput.value = goalCount;
    localStorage.setItem("snake_goal", goalCount);
});

clearHistoryBtn.addEventListener("click", () => {
    wins = { p1: 0, p2: 0, p3: 0, p4: 0 };
    localStorage.setItem("w_p1", 0);
    localStorage.setItem("w_p2", 0);
    localStorage.setItem("w_p3", 0);
    localStorage.setItem("w_p4", 0);
    playerIds.forEach((playerId) => {
        playerStates[playerId].winsEl.innerText = 0;
    });
});

function initConfigSettings() {
    initPlayerStates();

    playerCountSelect.value = activePlayerCount;
    goalInput.value = goalCount;
    speedSlider.value = gameSpeed;
    speedValue.innerText = `${gameSpeed}ms`;

    playerIds.forEach((playerId) => {
        playerStates[playerId].winsEl.innerText = wins[playerId];
        playerStates[playerId].scoreEl.innerText = 0;
    });

    updatePlayerPanels();
    updateControlUI();
    updateBadgeColors();
    draw();
}

function startMatchExecution() {
    activePlayerCount = parseInt(playerCountSelect.value) || 2;
    goalCount = Math.max(1, parseInt(goalInput.value) || 10);
    goalInput.value = goalCount;
    localStorage.setItem("snake_player_count", activePlayerCount);
    localStorage.setItem("snake_goal", goalCount);
    updatePlayerPanels();

    gameOverlay.classList.add("hidden");
    isGameRunning = true;

    playerIds.forEach((playerId) => {
        const state = playerStates[playerId];
        const spawn = spawnConfig[playerId];
        const direction = { ...spawn.dir };

        state.snake = [];
        for (let i = 0; i < 3; i++) {
            state.snake.push({
                x: spawn.x - (direction.x * i),
                y: spawn.y - (direction.y * i)
            });
        }

        state.dir = { ...direction };
        state.nextDir = { ...direction };
        state.eaten = 0;
        state.scoreEl.innerText = 0;
    });

    spawnFood();
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed);
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };

    const occupied = playerIds.slice(0, activePlayerCount).some((playerId) => {
        return isOnSnake(food, playerStates[playerId].snake);
    });

    if (occupied) {
        spawnFood();
    }
}

function isOnSnake(pos, snake) {
    return snake.some((segment) => segment.x === pos.x && segment.y === pos.y);
}

function gameLoop() {
    const activeIds = playerIds.slice(0, activePlayerCount);
    let foodWasEaten = false;

    activeIds.forEach((playerId) => {
        const state = playerStates[playerId];
        state.dir = state.nextDir;

        const head = {
            x: state.snake[0].x + state.dir.x,
            y: state.snake[0].y + state.dir.y
        };

        const ateFood = (head.x === food.x && head.y === food.y);
        state.snake.unshift(head);

        if (ateFood) {
            state.eaten += 1;
            state.scoreEl.innerText = state.eaten;
            foodWasEaten = true;
        } else {
            state.snake.pop();
        }
    });

    const winnerByGoal = activeIds.find((playerId) => playerStates[playerId].eaten >= goalCount);
    if (winnerByGoal) {
        terminateGame(winnerByGoal);
        return;
    }

    if (foodWasEaten) spawnFood();

    const deadPlayers = activeIds.filter((playerId) => checkSelfAndEdgeCollision(playerStates[playerId].snake));
    if (deadPlayers.length > 0) {
        terminateGame(null);
        return;
    }

    draw();
}

function checkSelfAndEdgeCollision(snake) {
    const head = snake[0];
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) return true;
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

function terminateGame(winnerId = null) {
    clearInterval(gameInterval);
    isGameRunning = false;

    gameOverlay.classList.remove("hidden");
    actionBtn.innerText = "Execute Rematch";

    if (winnerId) {
        overlayText.innerText = `${playerNames[winnerId]} reaches ${goalCount} food!`;
        wins[winnerId] += 1;
        localStorage.setItem(`w_${winnerId}`, wins[winnerId]);
        playerStates[winnerId].winsEl.innerText = wins[winnerId];
        return;
    }

    const leader = playerIds
        .slice(0, activePlayerCount)
        .slice()
        .sort((a, b) => playerStates[b].eaten - playerStates[a].eaten)[0];

    if (leader) {
        overlayText.innerText = `${playerNames[leader]} leads the board`;
    } else {
        overlayText.innerText = "No clear winner";
    }
}

function draw() {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--canvas-bg").trim();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--food-color").trim();
    ctx.fillRect(food ? food.x * GRID_SIZE + 1 : 0, food ? food.y * GRID_SIZE + 1 : 0, GRID_SIZE - 2, GRID_SIZE - 2);

    playerIds.slice(0, activePlayerCount).forEach((playerId) => {
        const state = playerStates[playerId];
        if (state.snake && state.snake.length) {
            ctx.fillStyle = state.colorPicker.value;
            state.snake.forEach((segment) => {
                ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
            });
        }
    });
}

actionBtn.addEventListener("click", startMatchExecution);

initConfigSettings();
