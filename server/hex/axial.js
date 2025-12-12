// axial.js
const DIRS = [
    { dq: +1, dr:  0 },
    { dq: +1, dr: -1 },
    { dq:  0, dr: -1 },
    { dq: -1, dr:  0 },
    { dq: -1, dr: +1 },
    { dq:  0, dr: +1 },
  ];
  
  function add(q, r, dq, dr) { return { q: q + dq, r: r + dr }; }
  
  function inBounds(q, r, bounds) {
    return q >= bounds.minQ && q <= bounds.maxQ && r >= bounds.minR && r <= bounds.maxR;
  }

  function hexDistance(q1, r1, q2, r2) {
    const dq = q2 - q1;
    const dr = r2 - r1;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }
  
  module.exports = { DIRS, add, inBounds, hexDistance };
  