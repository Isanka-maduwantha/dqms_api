// Minimal Socket.io wiring so Module 6 (F-6.1 Call Next) and billing/inventory alerts
// can broadcast in real time. Full queue/lobby broadcasting is Module 4/5 — out of scope here.
const { Server } = require('socket.io');

let io = null;

function init(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: 'http://localhost:5173',
            credentials: true
        }
    });
    return io;
}

// Returns the io instance, or null if sockets haven't been initialized (e.g. in tests).
function getIO() {
    return io;
}

module.exports = { init, getIO };
