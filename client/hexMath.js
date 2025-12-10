const HEX_SIZE = 32;

// axial (q, r) → pixel for FLAT-TOP layout
function hexToPixel(q, r) {
  const x = HEX_SIZE * (3/2 * q);
  const y = HEX_SIZE * (Math.sqrt(3) * (r + q / 2));
  return { x, y };
}

// draw one FLAT-TOP hex
function drawHex(ctx, x, y, size, fill = null, stroke = "#333") {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i); // flat-top: no -30 offset
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  ctx.strokeStyle = stroke;
  ctx.stroke();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function hexDistance(dq, dr) {
    // axial hex distance from (0,0) to (dq,dr)
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}
  
function inBounds(q, r, bounds) {
    if (!bounds) return true; // safety if you haven't wired bounds yet
    return (
        q >= bounds.minQ && q <= bounds.maxQ &&
        r >= bounds.minR && r <= bounds.maxR
    );
}
