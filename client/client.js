const status = document.getElementById("status");

let myId = null;
let gameState = { players: {} };

const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
  status.textContent = "Connected to server";
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "WELCOME") {
    myId = msg.id;
    console.log("Player ID:", myId);
    status.textContent = "Joined game";
  }

  if (msg.type === "UPDATE") {
    gameState = msg.state;
    render(gameState, myId);
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
