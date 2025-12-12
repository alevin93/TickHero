const WebSocket = require('ws');

const { spawnChests } = require('./systems/chests');
const { chooseMovementIntents, executeMovement } = require('./handlers/movement');

const TICK_RATE = 1000;

const wss = new WebSocket.Server({ port: 8080 });

let players = {};
let gameState = {
    tick: 0,
    bounds: { minQ: -50, maxQ: 50, minR: -50, maxR: 50 },
    players: {},
    chests: new Map(),
}

spawnChests(gameState, players);

wss.on('connection', (ws) => {

    ws.on('message', msg => {
        const data = JSON.parse(msg);
        let id = data.playerId;
        console.log(data.type === "HELLO");
        console.log(data.playerId);
        console.log(!data.playerId);
        if(data.type === "HELLO") {
            if(!players[data.playerId]) {
                id = Math.random().toString(36).slice(2);
                players[id] = {
                    id: id,
                    socket: ws,
                    mode: "AGGRESSIVE",
                    intent: null,
                    level: 1,
                    hp: 10,
                    speed: 1,
                    q: Math.floor(Math.random() * 101) - 50,
                    r: Math.floor(Math.random() * 101) - 50,
                }
                ws.id = id;
            }
            else {
                players[data.playerId].socket = ws;
                ws.id = data.playerId;
            }
            console.log("Player connected: ", id);
            gameState.players[id] = players[id];
            ws.send(JSON.stringify({ type: "WELCOME", id: id}));
            ws.send(JSON.stringify({ type: "UPDATE",  state: gameState }));
        }
        if(data.type === "SET_MODE") {
            let id = ws.id;
            players[id].mode = data.mode;
            console.log(`Player ${id} switched to ${data.mode}`);
        }
    });

    ws.on('close', () => {
        console.log(`Player ${ws.id} disconnected`);
    });
});

setInterval(() => {
    
    spawnChests(gameState, players);
    resolveActions(players);
    resolveAttacks(players);
    resolveMovement(players, gameState);

    gameState.tick++;
    sendUpdates(players);

    console.log("----------TICK #", gameState.tick, "-------------");
    console.log(gameState);

}, TICK_RATE);

function sendUpdates(players) {
    for(const id in players) {
        const p = players[id];
        const ws = p.socket
        console.log("Sending update to player: ", id);
        ws.send(JSON.stringify({ type: "UPDATE",  state: gameState }));
    }
}

function resolveActions(players) {
    
}

function resolveAttacks(players) {
    
}

function resolveMovement(players) {
    chooseMovementIntents(players, gameState);
    gameState = executeMovement(players, gameState);
}

console.log("Server is running on port 8080");