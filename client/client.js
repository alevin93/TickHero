const status = document.getElementById("status");

let myId = null;
let gameState = { players: {} };
let lastQ = null;
let lastR = null;
let lastPlayerPositions = {}; // Track all players' last positions

// Animation state for grid (player movement)
let offsetX = 0;
let offsetY = 0;
let animStartMs = 0;
let animDurationMs = 500; // animation duration in ms
let animTargetX = 0;
let animTargetY = 0;
let animFromX = 0;
let animFromY = 0;

// Animation state for enemies (individual per enemy)
let enemyAnimations = {}; // { playerId: { fromX, fromY, targetX, targetY, startMs } }

const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
  status.textContent = "Connected to server";
  let savedId = localStorage.getItem("playerId");
  ws.send(JSON.stringify({
    type: "HELLO",
    playerId: savedId
  }));
  myId = savedId;
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if(!myId) {
    myId = msg.id;
  }

  if (msg.type === "WELCOME") {
    console.log("Player ID:", myId);
    myId = msg.id;
    localStorage.setItem("playerId", myId);
    status.textContent = "Joined game";
  }

  if (msg.type === "UPDATE") {
    gameState = msg.state;
    console.log(gameState);
    
    const now = performance.now();
    
    // Check if player moved and start grid animation
    if (myId && gameState.players[myId]) {
      const newQ = gameState.players[myId].q;
      const newR = gameState.players[myId].r;
      
      if (lastQ !== null && lastR !== null) {
        const stepDQ = newQ - lastQ;
        const stepDR = newR - lastR;
        
        // Only animate if player actually moved
        if (stepDQ !== 0 || stepDR !== 0) {
          const stepPx = hexToPixel(stepDQ, stepDR);
          
          // Reset offset and start animation from 0 to -stepPx
          // (negative because we move the world in opposite direction)
          offsetX = 0;
          offsetY = 0;
          animFromX = 0;
          animFromY = 0;
          animTargetX = -stepPx.x;
          animTargetY = -stepPx.y;
          animStartMs = now;
        }
      }
      
      lastQ = newQ;
      lastR = newR;
    }
    
    // Check all players for movement and start enemy animations
    for (const id in gameState.players) {
      if (id === myId) continue; // Skip current player (handled above)
      
      const p = gameState.players[id];
      const lastPos = lastPlayerPositions[id];
      
      if (lastPos) {
        const stepDQ = p.q - lastPos.q;
        const stepDR = p.r - lastPos.r;
        
        // Only animate if enemy actually moved
        if (stepDQ !== 0 || stepDR !== 0) {
          const stepPx = hexToPixel(stepDQ, stepDR);
          
          // Start animation for this enemy
          enemyAnimations[id] = {
            fromX: 0,
            fromY: 0,
            targetX: stepPx.x,
            targetY: stepPx.y,
            startMs: now
          };
        }
      }
      
      // Update last known position
      lastPlayerPositions[id] = { q: p.q, r: p.r };
    }
    
    // Clean up animations for players that no longer exist
    for (const id in enemyAnimations) {
      if (!gameState.players[id]) {
        delete enemyAnimations[id];
      }
    }
    for (const id in lastPlayerPositions) {
      if (!gameState.players[id]) {
        delete lastPlayerPositions[id];
      }
    }
  }
};

ws.onclose = () => {
  status.textContent = "Disconnected from server";
};

function sendMode(mode) {

  if (!myId) return;

  ws.send(JSON.stringify({
    type: "SET_MODE",
    mode
  }));

  status.textContent = `Mode set to ${mode}`;
}

document.getElementById("btnAggressive")
  .onclick = () => sendMode("AGGRESSIVE");

document.getElementById("btnFlee")
  .onclick = () => sendMode("FLEE");

document.getElementById("btnScavenge")
  .onclick = () => sendMode("SCAVENGE");

// Animation loop
function loop() {
  if (gameState && myId) {
    const now = performance.now();
    
    // Update grid animation (player movement)
    const elapsed = now - animStartMs;
    const t = Math.min(1, elapsed / animDurationMs);
    
    // Ease function (ease-out)
    const easeT = 1 - Math.pow(1 - t, 3);
    
    if (t < 1) {
      // Still animating
      offsetX = animFromX + (animTargetX - animFromX) * easeT;
      offsetY = animFromY + (animTargetY - animFromY) * easeT;
    } else {
      // Animation complete, reset offset (gameState already has new position)
      offsetX = 0;
      offsetY = 0;
    }
    
    // Update enemy animations
    const currentEnemyOffsets = {};
    for (const id in enemyAnimations) {
      const anim = enemyAnimations[id];
      const elapsed = now - anim.startMs;
      const t = Math.min(1, elapsed / animDurationMs);
      const easeT = 1 - Math.pow(1 - t, 3);
      
      if (t < 1) {
        // Still animating
        currentEnemyOffsets[id] = {
          x: anim.fromX + (anim.targetX - anim.fromX) * easeT,
          y: anim.fromY + (anim.targetY - anim.fromY) * easeT
        };
      } else {
        // Animation complete, remove it
        delete enemyAnimations[id];
        currentEnemyOffsets[id] = { x: 0, y: 0 };
      }
    }
    
    render(gameState, myId, offsetX, offsetY, currentEnemyOffsets);
  }
  
  requestAnimationFrame(loop);
}

// Start animation loop
loop();
