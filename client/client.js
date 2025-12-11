const status = document.getElementById("status");

let myId = null;
let gameState = { players: {} };

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
    localStorage.setItem("playerId", myId);
    status.textContent = "Joined game";
  }

  if (msg.type === "UPDATE") {
    gameState = msg.state;
    console.log(gameState);
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
