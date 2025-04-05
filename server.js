// server.js
const http = require('http');
const { Server } = require("socket.io");
const { nanoid } = require('nanoid'); // Use 'npm install nanoid' for unique IDs

const server = http.createServer((req, res) => {
    // Basic HTTP server needed for Socket.IO, can serve duel.html here if needed
    res.writeHead(404); // Simple default handler
    res.end();
});

const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from anywhere for testing - RESTRICT IN PRODUCTION
        methods: ["GET", "POST"]
    }
});

const games = {}; // Store active games { gameId: { players: {playerId: {...state}}, turn: playerId, ... } }
const MAX_PLAYERS_PER_GAME = 2;

console.log("Socket.IO server starting...");

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.emit('assignId', socket.id); // Send the player their unique ID

    // --- Game Joining Logic ---
    let gameId = findAvailableGame();
    if (!gameId) {
        gameId = nanoid(8); // Create a new game ID
        games[gameId] = {
            id: gameId,
            players: {},
            // Add other game state properties: turn, phase, stack, etc.
        };
        console.log(`Created new game: ${gameId}`);
    }

    socket.join(gameId);
    games[gameId].players[socket.id] = { // Initialize basic player state
        id: socket.id,
        name: `Player_${socket.id.substring(0, 4)}`, // Simple default name
        deckName: null,
        deckList: null, // Store the raw list from client
        library: [],
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        life: 20,
        isReady: false,
        // Add more player state: mana, status effects etc.
    };
    console.log(`Player ${socket.id} joined game ${gameId}`);

    // Notify player about the room status
    const playerCount = Object.keys(games[gameId].players).length;
    if (playerCount < MAX_PLAYERS_PER_GAME) {
        socket.emit('roomStatus', 'Waiting for opponent...');
    } else {
        // Notify both players the room is full
        io.to(gameId).emit('roomStatus', 'Opponent joined. Choose your decks!');
    }
     // Notify others in the room (if any)
     socket.to(gameId).emit('roomStatus', 'Opponent has joined.');


    // --- Player Ready ---
    socket.on('playerReady', ({ deckName, deckList }) => {
        const game = games[gameId];
        if (!game || !game.players[socket.id]) return; // Game or player not found

        const playerState = game.players[socket.id];
        if (playerState.isReady) return; // Already ready

        console.log(`Player ${socket.id} is ready with deck: ${deckName}`);
        playerState.isReady = true;
        playerState.deckName = deckName;
        playerState.deckList = deckList; // Store the deck list received from client

        // Notify opponent
        socket.to(gameId).emit('opponentReady', playerState.name);

        // Check if both players are ready
        const players = Object.values(game.players);
        if (players.length === MAX_PLAYERS_PER_GAME && players.every(p => p.isReady)) {
            console.log(`Game ${gameId} starting!`);
            initializeGame(gameId); // Setup libraries, draw hands, etc.
            io.to(gameId).emit('startGame', getSanitizedGameState(gameId)); // Send initial state
        }
    });

    // --- Chat ---
    socket.on('chatMessage', (message) => {
        const game = games[gameId];
        if (!game || !game.players[socket.id]) return;
        const senderName = game.players[socket.id].name;
        // Broadcast to everyone in the room *including sender* for simplicity
        io.to(gameId).emit('chatMessage', { senderName, message });
    });

    // --- Life Update ---
    socket.on('updateLife', (newLifeTotal) => {
        const game = games[gameId];
         if (!game || !game.players[socket.id]) return;

         // Basic Validation (more needed in real app)
         if (typeof newLifeTotal !== 'number' || !Number.isInteger(newLifeTotal)) {
             socket.emit('gameError', 'Invalid life total update.');
             return;
         }

        game.players[socket.id].life = newLifeTotal;
        console.log(`Player ${socket.id} life updated to ${newLifeTotal}`);
        // Send full state update
        io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId));
    });

    // --- Card Actions (Movement, Tapping etc.) ---
    socket.on('cardAction', (data) => {
        const game = games[gameId];
        if (!game || !game.players[socket.id]) return;

        console.log(`Received cardAction from ${socket.id}:`, data);

        // !!! CRUCIAL: Implement VALIDATION here !!!
        // - Does the player own the card (cardId)?
        // - Is the card actually in the sourceZone?
        // - Is the requested action valid (e.g., can't move from library easily)?
        // - If moving to battlefield, are position coordinates valid?
        // This is complex and depends on your exact game rules.

        // --- Example: Basic Move + Tap Logic (HIGHLY SIMPLIFIED) ---
        const playerState = game.players[socket.id];
        const { cardId, sourceZone, action, targetZone, position } = data;
        let cardToModify = null;
        let cardIndex = -1;

        // 1. Find the card in the source zone
        if (sourceZone === 'hand') {
            cardIndex = playerState.hand.findIndex(c => c.id === cardId);
            if (cardIndex > -1) cardToModify = playerState.hand[cardIndex];
        } else if (sourceZone === 'battlefield') {
            cardIndex = playerState.battlefield.findIndex(c => c.id === cardId);
             if (cardIndex > -1) cardToModify = playerState.battlefield[cardIndex];
        } else if (sourceZone === 'graveyard') {
            cardIndex = playerState.graveyard.findIndex(c => c.id === cardId);
             if (cardIndex > -1) cardToModify = playerState.graveyard[cardIndex];
        } else if (sourceZone === 'exile') {
             cardIndex = playerState.exile.findIndex(c => c.id === cardId);
             if (cardIndex > -1) cardToModify = playerState.exile[cardIndex];
        }
        // Add Library logic if needed (more complex)

        if (!cardToModify) {
            console.error(`Card ${cardId} not found in ${sourceZone} for player ${socket.id}`);
            socket.emit('gameError', `Card not found in source zone.`);
            return; // Card not found where expected
        }

         // 2. Perform the action
        let stateChanged = false;
        if (action === 'toggleTap' && sourceZone === 'battlefield') {
            cardToModify.isTapped = !cardToModify.isTapped;
            stateChanged = true;
            console.log(`Card ${cardId} tapped state is now ${cardToModify.isTapped}`);
        } else if (targetZone) { // Handle movement actions
            // Remove from source zone
            playerState[sourceZone].splice(cardIndex, 1);

            // Add to target zone
            // Reset transient properties like tap status unless moving on battlefield
            if (targetZone !== 'battlefield' || sourceZone !== 'battlefield') {
                 delete cardToModify.isTapped;
                 delete cardToModify.x;
                 delete cardToModify.y;
            }
            if (targetZone === 'battlefield') {
                 cardToModify.isTapped = false; // Usually enters untapped
                 cardToModify.x = position?.x ?? 10; // Use provided pos or default
                 cardToModify.y = position?.y ?? 10;
                 playerState.battlefield.push(cardToModify);
            } else if (targetZone === 'hand') {
                 playerState.hand.push(cardToModify);
            } else if (targetZone === 'graveyard') {
                 playerState.graveyard.push(cardToModify);
            } else if (targetZone === 'exile') {
                 playerState.exile.push(cardToModify);
            } else if (targetZone === 'libraryTop') {
                 playerState.library.unshift(cardToModify); // Add to beginning
            } else if (targetZone === 'libraryBottom') {
                 playerState.library.push(cardToModify); // Add to end
            } else {
                 console.error("Unknown target zone:", targetZone);
                  // Put card back in source zone to prevent loss (maybe)
                  playerState[sourceZone].splice(cardIndex, 0, cardToModify);
                  socket.emit('gameError', `Invalid target zone.`);
                  return;
            }
            stateChanged = true;
            console.log(`Moved card ${cardId} from ${sourceZone} to ${targetZone}`);
        } else if (action && !targetZone){ // Actions like tapping that don't change zone
            if (action === 'toggleTap' && sourceZone === 'battlefield') {
                 // Already handled above, just ensuring stateChanged is true
                 stateChanged = true;
            }
            // Handle other specific actions like "viewCard" (no state change needed)
            else if (action === 'viewCard') {
                // No server state change, client handles popup
            } else {
                console.warn("Unhandled action without targetZone:", action);
            }
        }


        // 3. If state changed, broadcast update
        if (stateChanged) {
            io.to(gameId).emit('gameStateUpdate', getSanitizedGameState(gameId));
        } else {
             console.log("Action resulted in no state change:", data);
        }
    });


    // --- Disconnect ---
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const game = games[gameId];
        if (game) {
            const playerName = game.players[socket.id]?.name || `Player ${socket.id.substring(0,4)}`;
            delete game.players[socket.id]; // Remove player from game
            console.log(`Player ${socket.id} removed from game ${gameId}`);

            // Notify remaining player (if any)
            socket.to(gameId).emit('playerLeft', playerName);

            // Clean up game if empty
            if (Object.keys(game.players).length === 0) {
                console.log(`Game ${gameId} is empty, deleting.`);
                delete games[gameId];
            }
        }
    });
});

// --- Helper Functions ---

function findAvailableGame() {
    for (const id in games) {
        if (Object.keys(games[id].players).length < MAX_PLAYERS_PER_GAME) {
            return id;
        }
    }
    return null; // No available games
}

function initializeGame(gameId) {
    const game = games[gameId];
    if (!game) return;

    Object.values(game.players).forEach(player => {
        player.library = [];
        player.hand = [];
        player.battlefield = [];
        player.graveyard = [];
        player.exile = [];
        player.life = 20; // Reset life

        // Create the library from the deckList
        if (player.deckList) {
            for (const cardName in player.deckList) {
                const cardInfo = player.deckList[cardName];
                for (let i = 0; i < cardInfo.quantity; i++) {
                    player.library.push({
                        id: `${cardName}_${i}_${nanoid(4)}`, // Unique ID for this instance
                        name: cardName,
                        imageUrl: cardInfo.imageUrl,
                        normalImageUrl: cardInfo.normalImageUrl,
                        // Add other base card properties if needed (type, cost etc) - complicates things
                    });
                }
            }
        } else {
            console.error(`Player ${player.id} has no deckList!`);
            // Maybe add some basic lands as default?
        }

        // Shuffle library
        shuffleArray(player.library);

        // Draw initial hand (e.g., 7 cards)
        for (let i = 0; i < 7 && player.library.length > 0; i++) {
            player.hand.push(player.library.shift());
        }
    });

     // Set starting player, turn order, etc. (more advanced)
     // game.turn = Object.keys(game.players)[Math.floor(Math.random()*2)];

    console.log(`Game ${gameId} initialized.`);
}

// Basic shuffle function (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Creates a version of the game state safe to send to clients
// Hides opponent's hand details
function getSanitizedGameState(gameId) {
    const game = games[gameId];
    if (!game) return null;

    const sanitizedState = {
        gameId: game.id,
        // Add other global game state (turn, phase) here if needed
        players: {}
    };

    const playerIds = Object.keys(game.players);

    playerIds.forEach(playerId => {
        const playerState = game.players[playerId];
        sanitizedState.players[playerId] = {
            id: playerState.id,
            name: playerState.name,
            life: playerState.life,
            // Hand: Send full hand only to the owner, count to others
            // Note: This needs to be customized per recipient, SocketIO rooms help here
            // For simplicity now, we'll create a general state and client filters
            hand: playerState.hand.map(card => ({ ...card })), // Send full hand details initially
            handCount: playerState.hand.length, // Always send count
            battlefield: playerState.battlefield.map(card => ({ ...card })),
            graveyard: playerState.graveyard.map(card => ({ ...card })),
            exile: playerState.exile.map(card => ({ ...card })),
            libraryCount: playerState.library.length, // Only send count
        };
    });

     // **Refinement needed:** To properly hide opponent hands, you should ideally send
     // tailored state updates to each client. A simpler approach (used here)
     // is to send everything and have the client JS *not render* opponent hand details.
     // Let's modify the client rendering logic to handle this.

    return sanitizedState;
}


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});