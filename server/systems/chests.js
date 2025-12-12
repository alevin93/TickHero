function tileCountFromBounds(bounds) {
    const qCount = (bounds.maxQ - bounds.minQ + 1);
    const rCount = (bounds.maxR - bounds.minR + 1);
    return qCount * rCount; // parallelogram in axial coords (fine for your current world)
  }
  
  function desiredChestCount(bounds, playerCount) {
    const tiles = tileCountFromBounds(bounds);
  
    // Base density: ~1 chest per 400 tiles (tweak this)
    const base = Math.floor(tiles / 400);
  
    // Extra chests as more players join (tweak this)
    const bonus = Math.max(0, playerCount) * 2;
  
    // Clamp so it never gets silly
    const minChests = 10;
    const maxChests = Math.floor(tiles / 40); // at most ~2.5% of tiles
  
    return Math.max(minChests, Math.min(maxChests, base + bonus));
  }
  
  function chestKey(q, r) {
    return `${q},${r}`;
  }
  
  function buildOccupiedSet(players) {
    const occ = new Set();
    for (const id in players) {
      const p = players[id];
      if (!p) continue;
      occ.add(chestKey(p.q, p.r));
    }
    return occ;
  }
  
  // Adds chests until we hit the desired count
  function spawnChests(gameState, players) {
    const bounds = gameState.bounds;
    const playerCount = Object.keys(players).length;
    const target = desiredChestCount(bounds, playerCount);
  
    // gameState.chests is a Map() in your server right now :contentReference[oaicite:2]{index=2}
    if (!gameState.chests) gameState.chests = new Map();
  
    const occupied = buildOccupiedSet(players);
  
    let toSpawn = target - gameState.chests.size;
    if (toSpawn <= 0) return;
  
    const maxAttempts = toSpawn * 50; // avoids infinite loops if crowded
    let attempts = 0;
  
    while (toSpawn > 0 && attempts < maxAttempts) {
      attempts++;
  
      const q = Math.floor(Math.random() * (bounds.maxQ - bounds.minQ + 1)) + bounds.minQ;
      const r = Math.floor(Math.random() * (bounds.maxR - bounds.minR + 1)) + bounds.minR;
      const key = chestKey(q, r);
  
      if (occupied.has(key)) continue;
      if (gameState.chests.has(key)) continue;
  
      const chest = {
        id: `ch_${key}`,
        q,
        r,
        // later: gold, rarity, respawnTick, etc.
        spawnedAtTick: gameState.tick ?? 0
      };
  
      gameState.chests.set(key, chest);
      toSpawn--;
    }
  }

  module.exports = { spawnChests }