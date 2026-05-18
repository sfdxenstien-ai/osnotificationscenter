'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3001;

const app = express();

// Serve static files from client folder
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Grid Table Server listening on port ${PORT}`);
});

const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected clients count
let clientCount = 0;

io.on('connection', (socket) => {
  clientCount++;
  console.log(`Client connected. Total clients: ${clientCount}`);
  
  // Send current client count to all clients
  io.emit('clientCount', clientCount);

  /**
   * Handle row addition event
   * Client sends new row data, server broadcasts to all other clients
   */
  socket.on('rowAdded', (data) => {
    console.log('Row added:', data);
    // Broadcast to all clients except sender
    socket.broadcast.emit('rowAdded', data);
  });

  /**
   * Handle row edit event
   * Client sends updated row data, server broadcasts to all other clients
   */
  socket.on('rowEdited', (data) => {
    console.log('Row edited:', data);
    // Broadcast to all clients except sender
    socket.broadcast.emit('rowEdited', data);
  });

  /**
   * Handle row deletion event
   * Client sends row ID to delete, server broadcasts to all other clients
   */
  socket.on('rowDeleted', (data) => {
    console.log('Row deleted:', data);
    // Broadcast to all clients except sender
    socket.broadcast.emit('rowDeleted', data);
  });

  /**
   * Handle initial data sync request
   * New client requests current data from other clients
   */
  socket.on('requestDataSync', () => {
    console.log('Data sync requested');
    socket.broadcast.emit('requestDataSync', { socketId: socket.id });
  });

  /**
   * Handle data sync response
   * Client sends their current data to requesting client
   */
  socket.on('syncDataResponse', (data) => {
    console.log('Syncing data to new client');
    io.to(data.targetSocketId).emit('syncDataResponse', data.rows);
  });

  socket.on('disconnect', () => {
    clientCount--;
    console.log(`Client disconnected. Total clients: ${clientCount}`);
    io.emit('clientCount', clientCount);
  });
});
