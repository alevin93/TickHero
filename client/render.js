const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// how many hexes visible in every direction (hex radius)
const VIEW_RADIUS = 2;

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

function render(gameState, playerId) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameState || !gameState.players || !gameState.players[playerId]) return;

  const player = gameState.players[playerId];
  const bounds = gameState.bounds; // optional, but used if present

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
        MAP_ORIGIN.x + pt.x,
        MAP_ORIGIN.y + pt.y,
        HEX_SIZE,
        fillColor,
        strokeColor
      );
    }
  }

  // --------- draw all visible players ----------
  for (const id in gameState.players) {
    const p = gameState.players[id];

    const dq = p.q - player.q;
    const dr = p.r - player.r;
    const dist = hexDistance(dq, dr);

    // Only show other units actually in sight (inner radius)
    if (dist > VIEW_RADIUS - 1) continue;

    const pos = hexToPixel(dq, dr);
    const isMe = id === playerId;

    drawHex(
      ctx,
      MAP_ORIGIN.x + pos.x,
      MAP_ORIGIN.y + pos.y,
      HEX_SIZE * 0.6,
      isMe ? "#4CAF50" : "#F44336",
      "#EEE"
    );

    // Mode label (first letter)
    ctx.fillStyle = "#FFF";
    ctx.font = "10px sans-serif";
    ctx.fillText(
      p.mode[0],
      MAP_ORIGIN.x + pos.x - 4,
      MAP_ORIGIN.y + pos.y + 4
    );
  }
}


