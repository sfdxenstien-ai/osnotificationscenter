'use strict';

const express = require('express');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(__dirname));

// REST API endpoint to receive notifications from Salesforce Apex
app.post('/api/notifications', (req, res) => {
  console.log('Received notification from Salesforce:', JSON.stringify(req.body, null, 2));
  
  try {
    const payload = req.body;
    const eventType = payload.eventType;
    
    // Broadcast the notification to all connected WebSocket clients
    if (eventType === 'chatter_mention') {
      // Send to all connected clients
      io.emit('salesforce_notification', payload);
      
      // Send to specific users if mentioned users are provided
      if (payload.notifications) {
        payload.notifications.forEach(notification => {
          if (notification.mentionedUsers && notification.mentionedUsers.length > 0) {
            notification.mentionedUsers.forEach(userId => {
              // Emit to specific user room if using rooms
              io.to(userId).emit('user_notification', notification);
            });
          }
        });
      } else if (payload.notification) {
        const notification = payload.notification;
        if (notification.mentionedUsers && notification.mentionedUsers.length > 0) {
          notification.mentionedUsers.forEach(userId => {
            io.to(userId).emit('user_notification', notification);
          });
        }
      }
      
      console.log('Notification broadcasted to WebSocket clients');
    } else if (eventType === 'notification_update') {
      // Broadcast status update
      io.emit('notification_status_update', payload);
      console.log('Notification update broadcasted to WebSocket clients');
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Notification received and broadcasted',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error processing notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing notification',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connectedClients: io.engine.clientsCount
  });
});

// Serve index page for root path
app.get('/', (req, res) => {
  res.sendFile(INDEX, { root: __dirname });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`REST API endpoint: http://localhost:${PORT}/api/notifications`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  /**
   * Create function to send status
   * @param success {bool}
   * @param message {string}
   */
  const sendStatus = function({success, message}){
    socket.emit('status', {success, message});
  }

  // User joins a room (for targeted notifications)
  socket.on('join_user_room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room for notifications`);
    sendStatus({
      success: true,
      message: `Joined notification room for user ${userId}`
    });
  });

  // User leaves a room
  socket.on('leave_user_room', (userId) => {
    socket.leave(userId);
    console.log(`User ${userId} left notification room`);
  });

  socket.on('transmit', () => {
    io.emit('chatupdated');
  });

  socket.on('usertyping', (data) => {
    io.emit('istyping', data);
  });

  socket.on('userEnteredChat', () => {
    io.emit('refreshChatUsers');
  });

  socket.on('userLeftChat', () => {
    io.emit('refreshChatUsers');
  });

  socket.on('usernottyping', (data) => {
    io.emit('nottyping', data);
  });

  socket.on('input', (data) => {
    const name = data.name;
    const message = data.message;

    if (!name || !message) {
      sendStatus({
        success: false,
        message: 'Please enter a name and message'
      });
    } else {
      socket.emit('output', data);
      sendStatus({
        success: true,
        message: 'Message updating...'
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Send time update every second (for demo purposes)
setInterval(() => io.emit('time', new Date().toTimeString()), 1000);
