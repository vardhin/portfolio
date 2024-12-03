const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors());

// Create WebSocket server
const wss = new WebSocketServer({ 
    server,
    path: "/ws", // Specific path for WebSocket connections
    clientTracking: true,
    // Handle Cloudflare's proxy headers
    handleProtocols: (protocols, req) => {
        return protocols[0];
    }
});

// Basic HTTP endpoint to check if server is running
app.get('/', (req, res) => {
    res.send('Server is running');
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('New client connected');

    ws.on('message', (data) => {
        try {
            const messageData = JSON.parse(data);
            
            // Broadcast to all connected clients
            wss.clients.forEach((client) => {
                client.send(JSON.stringify(messageData));
            });
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
