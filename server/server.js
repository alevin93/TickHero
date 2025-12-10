const WebSocket = require('ws');

const TICK_RATE = 2000;

const wss = new WebSocket.Server({ port: 8080 });

let players = {};
let gameState = {
    tick: 0,
    bounds: { minQ: -50, maxQ: 50, minR: -50, maxR: 50 },
    players: {},
    chests: new Map(),
} 

wss.on('connection', (ws) => {

    const id = Math.random().toString(36).slice(2);
    players[id] = {
        id,
        socket: ws,
        mode: "AGGRESSIVE",
        level: 1,
        hp: 10,
        q: Math.floor(Math.random() * 10),
        r: Math.floor(Math.random() * 10),
    }

    console.log("Player connected: ", id);
    gameState.players[id] = players[id];

    ws.send(JSON.stringify({ type: "WELCOME", id}));

    ws.on('message', msg => {
        const data = JSON.parse(msg);

        if(data.type === "SET_MODE") {
            players[id].mode = data.mode;
            console.log(`Player ${id} switched to ${data.mode}`);
        }
    });

    ws.on('close', () => {
        delete players[id];
        console.log(`Player ${id} disconnected`);
    });
});

setInterval(() => {
    
    resolveActions(players);
    resolveAttacks(players);
    resolveMovement(players);

    sendUpdates(players);

    gameState.tick++;
    console.log("----------TICK #", gameState.tick, "-------------");

}, TICK_RATE);

function sendUpdates(players) {
    for(const id in players) {
        const p = players[id];
        const ws = p.socket
        console.log("Sending update to player: ", id);
        console.log("Game state: ", gameState);
        ws.send(JSON.stringify({ type: "UPDATE",  state: gameState }));
        
    }
}

function resolveActions(players) {
    
}

function resolveAttacks(players) {
    
}

function resolveMovement(players) {
    
}

console.log("Server is running on port 8080");