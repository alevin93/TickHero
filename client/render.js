const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// how many hexes visible in every direction (hex radius)
const VIEW_RADIUS = 3;

// center of the canvas
const MAP_ORIGIN = {
  x: canvas.width / 2,
  y: canvas.height / 2
};

// axial hex distance from (0,0) to (dq,dr)
function hexDistance(dq, dr) {
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// check if a world coordinate is inside the map bounds
function inBounds(q, r, bounds) {
  if (!bounds) return true; // if bounds not provided, treat as infinite
  return (
    q >= bounds.minQ && q <= bounds.maxQ &&
    r >= bounds.minR && r <= bounds.maxR
  );
}

function render(gameState, playerId, offsetX = 0, offsetY = 0, enemyOffsets = {}) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameState || !gameState.players || !gameState.players[playerId]) return;

  const player = gameState.players[playerId];
  const bounds = gameState.bounds; // optional, but used if present

  // Update debug info
  updateDebugInfo(gameState, playerId);

  // --------- draw background FOV grid ----------
  for (let dq = -VIEW_RADIUS; dq <= VIEW_RADIUS; dq++) {
    for (let dr = -VIEW_RADIUS; dr <= VIEW_RADIUS; dr++) {

      const dist = hexDistance(dq, dr);

      // Skip tiles outside the true hex radius (no diamond corners)
      if (dist > VIEW_RADIUS) continue;

      const q = player.q + dq;
      const r = player.r + dr;

      // Skip tiles that are outside the world bounds
      if (!inBounds(q, r, bounds)) continue;

      const pt = hexToPixel(dq, dr);

      // "Seen" vs "out of sight":
      // - dist <= VIEW_RADIUS - 1 → bright, in-sight
      // - dist == VIEW_RADIUS     → dimmer ring at edge of sight
      const inSight = dist <= VIEW_RADIUS - 1;

      const strokeColor = inSight ? "#444" : "#111";
      const fillColor   = inSight ? "#080808" : null;

      drawHex(
        ctx,
        MAP_ORIGIN.x + pt.x - offsetX,
        MAP_ORIGIN.y + pt.y - offsetY,
        HEX_SIZE,
        fillColor,
        strokeColor
      );
    }
  }

  // --------- draw all visible players ----------
  for (const id in gameState.players) {
    const p = gameState.players[id];
    const isMe = id === playerId;

    const dq = p.q - player.q;
    const dr = p.r - player.r;
    const dist = hexDistance(dq, dr);

    // Only show other units actually in sight (inner radius)
    if (dist > VIEW_RADIUS - 1) continue;

    const pos = hexToPixel(dq, dr);

    // Current player stays at center (no offset), others get grid offset + their own animation offset
    let drawX, drawY;
    if (isMe) {
      drawX = MAP_ORIGIN.x;
      drawY = MAP_ORIGIN.y;
    } else {
      // Apply grid offset (from player movement) and enemy's individual animation offset
      const enemyOffset = enemyOffsets[id] || { x: 0, y: 0 };
      drawX = MAP_ORIGIN.x + pos.x - offsetX + enemyOffset.x;
      drawY = MAP_ORIGIN.y + pos.y - offsetY + enemyOffset.y;
    }

    drawHex(
      ctx,
      drawX,
      drawY,
      HEX_SIZE * 0.6,
      isMe ? "#4CAF50" : "#F44336",
      "#EEE"
    );

    // Mode label (first letter)
    ctx.fillStyle = "#FFF";
    ctx.font = "10px sans-serif";
    ctx.fillText(
      p.mode[0],
      drawX - 4,
      drawY + 4
    );
  }
}

function updateDebugInfo(gameState, playerId) {
  const debugBox = document.getElementById("debugBox");
  const debugContent = document.getElementById("debugContent");
  
  if (!gameState || !gameState.players || !gameState.players[playerId]) {
    debugBox.style.display = "none";
    return;
  }

  debugBox.style.display = "block";
  const player = gameState.players[playerId];
  const bounds = gameState.bounds || {};

  // Calculate visible players and distances to all other players
  let visiblePlayers = 0;
  let nearestPlayerDist = null;
  let nearestPlayerId = null;
  const otherPlayers = [];

  for (const id in gameState.players) {
    if (id === playerId) continue;
    const p = gameState.players[id];
    const dq = p.q - player.q;
    const dr = p.r - player.r;
    const dist = hexDistance(dq, dr);
    
    otherPlayers.push({
      id: id.substring(0, 8) + '...', // Shortened ID for display
      fullId: id,
      q: p.q,
      r: p.r,
      dist: dist,
      mode: p.mode,
      hp: p.hp
    });
    
    if (dist <= VIEW_RADIUS - 1) {
      visiblePlayers++;
    }
    
    if (nearestPlayerDist === null || dist < nearestPlayerDist) {
      nearestPlayerDist = dist;
      nearestPlayerId = id;
    }
  }
  
  // Sort by distance
  otherPlayers.sort((a, b) => a.dist - b.dist);

  // Get chest count (Maps serialize to {} in JSON, so check for size or count keys)
  let chestCount = 0;
  if (gameState.chests) {
    if (typeof gameState.chests.size === 'number') {
      chestCount = gameState.chests.size;
    } else if (Array.isArray(gameState.chests)) {
      chestCount = gameState.chests.length;
    } else if (typeof gameState.chests === 'object') {
      chestCount = Object.keys(gameState.chests).length;
    }
  }

  // Build debug HTML
  let html = '';
  
  html += `<div class="debug-line"><span class="debug-label">Tick:</span><span class="debug-value">${gameState.tick || 0}</span></div>`;
  html += `<div class="debug-line"><span class="debug-label">Position:</span><span class="debug-value">(${player.q}, ${player.r})</span></div>`;
  html += `<div class="debug-line"><span class="debug-label">HP:</span><span class="debug-value">${player.hp || 0}</span></div>`;
  html += `<div class="debug-line"><span class="debug-label">Level:</span><span class="debug-value">${player.level || 1}</span></div>`;
  html += `<div class="debug-line"><span class="debug-label">Mode:</span><span class="debug-value">${player.mode || 'N/A'}</span></div>`;
  html += `<div class="debug-line"><span class="debug-label">Visible Players:</span><span class="debug-value">${visiblePlayers}</span></div>`;
  
  if (nearestPlayerDist !== null) {
    const nearest = otherPlayers[0];
    html += `<div class="debug-line"><span class="debug-label">Nearest Player:</span><span class="debug-value">${nearestPlayerDist} hexes (${nearest.id})</span></div>`;
    html += `<div class="debug-line"><span class="debug-label">  └─ Position:</span><span class="debug-value">(${nearest.q}, ${nearest.r})</span></div>`;
  } else {
    html += `<div class="debug-line"><span class="debug-label">Nearest Player:</span><span class="debug-value">None</span></div>`;
  }
  
  // Show all other players
  if (otherPlayers.length > 0) {
    html += `<div class="debug-line" style="margin-top: 8px; border-top: 1px solid #333; padding-top: 4px;"><span class="debug-label" style="color: #4CAF50;">All Players:</span></div>`;
    otherPlayers.forEach(p => {
      html += `<div class="debug-line" style="margin-left: 10px; font-size: 10px;">`;
      html += `<span class="debug-label">${p.id}:</span>`;
      html += `<span class="debug-value">${p.dist} hexes @ (${p.q}, ${p.r}) [${p.mode}] HP:${p.hp}</span>`;
      html += `</div>`;
    });
  }
  
  html += `<div class="debug-line"><span class="debug-label">Map Bounds:</span><span class="debug-value">Q[${bounds.minQ || '?'}, ${bounds.maxQ || '?'}] R[${bounds.minR || '?'}, ${bounds.maxR || '?'}]</span></div>`;
  html += `<div class="debug-line"><span class="debug-label">Chests:</span><span class="debug-value">${chestCount}</span></div>`;
  html += `<div class="debug-line"><span class="debug-label">Total Players:</span><span class="debug-value">${Object.keys(gameState.players || {}).length}</span></div>`;

  debugContent.innerHTML = html;
}

