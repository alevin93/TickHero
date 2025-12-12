const { DIRS, add, hexDistance } = require("../hex/axial");


function chooseMovementIntents(players, gameState) {
  
    for (const id in players) {
      const p = players[id];
      if (!p) continue;
  
      if (p.mode === "AGGRESSIVE") {
        intent = aggressiveMoveIntent(p, players, gameState);
      }
      if (p.mode === "FLEE") {
        intent = fleeMoveIntent(p, players, gameState);
      }
      if (p.mode === "SCAVENGE") {
        intent = scavengeMoveIntent(p, players, gameState);
      }
    }
  }

function aggressiveMoveIntent(p, players, gameState) {
    if (!p) return null;
  
    const enemy = findNearestEnemy(players, p.id);
    if (!enemy) return null;
  
    let best = null;
  
    for (const dir of DIRS) {
      const cand = add(p.q, p.r, dir.dq, dir.dr);
  
      // Bounds check
      if (gameState?.bounds) {
        const b = gameState.bounds;
        if (
          cand.q < b.minQ || cand.q > b.maxQ ||
          cand.r < b.minR || cand.r > b.maxR
        ) continue;
      }
  
      const dist = hexDistance(cand.q, cand.r, enemy.q, enemy.r);
  
      if (best === null || dist < best.dist) {
        best = { to: cand, dist };
      }
    }
  
    if (!best) return null;
  
    p.intent = best;
  }


  function fleeMoveIntent(p, players, gameState) {
    if (!p) return null;
  
    const enemy = findNearestEnemy(players, p.id);
    if (!enemy) return null;
  
    let best = null;
  
    for (const dir of DIRS) {
      const cand = add(p.q, p.r, dir.dq, dir.dr);
  
      // Bounds check
      if (gameState?.bounds) {
        const b = gameState.bounds;
        if (
          cand.q < b.minQ || cand.q > b.maxQ ||
          cand.r < b.minR || cand.r > b.maxR
        ) continue;
      }
  
      const dist = hexDistance(cand.q, cand.r, enemy.q, enemy.r);
  
      // FLEE: maximize distance
      if (best === null || dist > best.dist) {
        best = { to: cand, dist };
      }
    }
  
    if (!best) return null;
  
    p.intent = best;
  }

function scavengeMoveIntent(p, gameState) {
  if (!p) return null;

  const chest = findNearestChest(gameState, p); // { id, dist, q, r } or null
  if (!chest) return null;

  let best = null;

  for (const dir of DIRS) {
    const cand = add(p.q, p.r, dir.dq, dir.dr);

    // Bounds check
    if (gameState?.bounds) {
      const b = gameState.bounds;
      if (
        cand.q < b.minQ || cand.q > b.maxQ ||
        cand.r < b.minR || cand.r > b.maxR
      ) continue;
    }

    const dist = hexDistance(cand.q, cand.r, chest.q, chest.r);

    // SCAVENGE: minimize distance to the chest
    if (best === null || dist < best.dist) {
      best = { to: cand, dist };
    }
  }

  if (!best) return null;

  p.intent = best;
}


function findNearestEnemy(players, myId) {
    const me = players[myId];
    if (!me) return null;
  
    let best = null;
  
    for (const id in players) {
      if (id === myId) continue;
  
      const p = players[id];
      if (!p) continue;
  
      // optional filters for later:
      // if (p.hp <= 0) continue;
  
      const dist = hexDistance(me.q, me.r, p.q, p.r);
  
      if (
        best === null ||
        dist < best.dist ||
        (dist === best.dist && id < best.id) // deterministic tie-break
      ) {
        best = { id, dist, q: p.q, r: p.r };
      }
    }
  
    return best; // { id, dist, q, r } or null
  }


  function executeMovement(players, gameState) {
    const bounds = gameState?.bounds;
    const tick = gameState?.tick ?? 0;
  
    const key = (q, r) => `${q},${r}`;
  
    const inBounds = (q, r) => {
      if (!bounds) return true;
      return (
        q >= bounds.minQ && q <= bounds.maxQ &&
        r >= bounds.minR && r <= bounds.maxR
      );
    };
  
    // Deterministic “coinflip” tiebreak: stable across runs
    function tieScore(id, targetKey) {
      // simple string hash
      const s = `${tick}|${id}|${targetKey}`;
      let h = 2166136261; // FNV-ish start
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      // unsigned 32-bit
      return h >>> 0;
    }
  
    // 1) Collect proposed moves -> claims by destination
    const claims = new Map(); // destKey -> [ { id, toQ, toR, speed, level } ]
    const proposed = new Map(); // id -> move record (for quick lookup)
  
    const ids = Object.keys(players).sort(); // deterministic iteration
  
    for (const id of ids) {
      const p = players[id];
      if (!p) continue;
  
      const intent = p.intent;
      if (!intent) continue;
  
      // Support either {to:{q,r}} or {dq,dr}
      let toQ, toR;
  
      if (intent.to && typeof intent.to.q === "number" && typeof intent.to.r === "number") {
        toQ = intent.to.q;
        toR = intent.to.r;
      } else if (typeof intent.dq === "number" && typeof intent.dr === "number") {
        toQ = p.q + intent.dq;
        toR = p.r + intent.dr;
      } else {
        continue; // malformed intent
      }
  
      // If they’re not actually moving, ignore
      if (toQ === p.q && toR === p.r) continue;
  
      // Bounds check
      if (!inBounds(toQ, toR)) continue;
  
      const speed = p.speed ?? 1;
      const level = p.level ?? 1;
  
      const move = { id, toQ, toR, speed, level };
      proposed.set(id, move);
  
      const destKey = key(toQ, toR);
      if (!claims.has(destKey)) claims.set(destKey, []);
      claims.get(destKey).push(move);
    }
  
    // 2) Pick winners per destination (speed -> level -> tieScore)
    const winners = new Map(); // id -> move
    for (const [destKey, list] of claims.entries()) {
      if (list.length === 1) {
        winners.set(list[0].id, list[0]);
        continue;
      }
  
      list.sort((a, b) => {
        if (b.speed !== a.speed) return b.speed - a.speed;
        if (b.level !== a.level) return b.level - a.level;
  
        // deterministic tiebreak (acts like coinflip, but repeatable)
        const ta = tieScore(a.id, destKey);
        const tb = tieScore(b.id, destKey);
        if (tb !== ta) return tb - ta;
  
        // final deterministic fallback
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
  
      winners.set(list[0].id, list[0]);
      // everyone else loses and stays put this tick
    }
  
    // 3) Apply winning moves simultaneously
    for (const [id, move] of winners.entries()) {
      const p = players[id];
      if (!p) continue;
      p.q = move.toQ;
      p.r = move.toR;
    }
  
    // 4) Clear intents (so they must be re-chosen next tick)
    for (const id of ids) {
      const p = players[id];
      if (p) p.moveIntent = null;
    }
  
    return gameState;
  }

  module.exports = { chooseMovementIntents, executeMovement };