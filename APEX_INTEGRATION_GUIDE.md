# WebSocket Server Integration with Salesforce Apex

## Overview
This integration allows Salesforce Apex classes to send real-time notifications to a WebSocket server via HTTP callouts. The WebSocket server then broadcasts these events to connected clients.

## Architecture

```
Salesforce (Apex) → HTTP POST → WebSocket Server → WebSocket Broadcast → Connected Clients
```

### How It Works:
1. **Apex HTTP Callout**: Salesforce makes a RESTful HTTP POST request to the WebSocket server
2. **REST API Endpoint**: WebSocket server receives the notification data
3. **WebSocket Broadcast**: Server broadcasts the data to all connected WebSocket clients
4. **Client Receives**: LWC or other clients receive real-time updates

## Setup Instructions

### 1. WebSocket Server Setup

#### Install Dependencies
```bash
cd Work/sf-chat-websocket-server-master-main
npm install express socket.io body-parser
```

#### Update package.json
Add `body-parser` to dependencies:
```json
{
  "dependencies": {
    "express": "^4.17.1",
    "socket.io": "^4.0.0",
    "body-parser": "^1.19.0"
  }
}
```

#### Use Updated Server File
Replace `server.js` with `server-with-rest-api.js` or update your existing server.js with the REST API endpoints.

```bash
# Option 1: Replace
cp server-with-rest-api.js server.js

# Option 2: Run the new server directly
node server-with-rest-api.js
```

#### Start Server
```bash
npm start
# or
node server.js
```

Server will start on port 3000 with endpoints:
- **REST API**: `http://localhost:3000/api/notifications` (POST)
- **Health Check**: `http://localhost:3000/api/health` (GET)
- **WebSocket**: `ws://localhost:3000`

### 2. Salesforce Setup

#### Create Named Credential
1. Navigate to **Setup → Named Credentials → New Legacy**
2. Configure:
   - **Label**: `WebSocket Server`
   - **Name**: `WebSocket_Server`
   - **URL**: `https://your-websocket-server-domain.com` (or use ngrok for testing)
   - **Identity Type**: `Anonymous`
   - **Authentication**: `No Authentication` (or configure as needed)

For **local testing with ngrok**:
```bash
# Install ngrok: https://ngrok.com/
ngrok http 3000

# Use the ngrok HTTPS URL in Named Credential
# Example: https://abc123.ngrok.io
```

#### Add Remote Site Settings
If not using Named Credential:
1. Navigate to **Setup → Security → Remote Site Settings → New**
2. Configure:
   - **Remote Site Name**: `WebSocket_Server`
   - **Remote Site URL**: `https://your-websocket-server-domain.com`
   - **Active**: ✓ Checked

#### Deploy Apex Classes
Deploy these files to your Salesforce org:
- `WebSocketNotificationService.cls`
- `WebSocketNotificationService.cls-meta.xml`
- Updated `FeedItemService.cls`

### 3. Test the Integration

#### Test from Salesforce Developer Console
```apex
// Create a test notification
ChatterNotification__c testNotification = new ChatterNotification__c(
    CaseId__c = '500XXXXXXXXXXXXXXX', // Use a real Case ID
    CaseNumber__c = 'TEST-001',
    MessagePreview__c = 'Test notification from Apex',
    NotificationType__c = 'Mention',
    Status__c = 'Pending',
    MentionedUsers__c = UserInfo.getUserId(),
    NotificationDateTime__c = System.now()
);
insert testNotification;

// Send to WebSocket server
WebSocketNotificationService.sendSingleNotification(testNotification);
```

#### Monitor WebSocket Server Logs
```bash
# Watch server console for:
Received notification from Salesforce: {
  "eventType": "chatter_mention",
  "notification": {...}
}
Notification broadcasted to WebSocket clients
```

#### Test with Client HTML
Create a test client to receive WebSocket events:

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Test Client</title>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>
    <h1>Salesforce Notification Test</h1>
    <div id="notifications"></div>

    <script>
        const socket = io();
        
        // Join user room for targeted notifications
        const userId = 'USER_ID_FROM_SALESFORCE'; // Replace with actual User ID
        socket.emit('join_user_room', userId);
        
        // Listen for notifications
        socket.on('salesforce_notification', (data) => {
            console.log('Received Salesforce notification:', data);
            displayNotification(data);
        });
        
        socket.on('user_notification', (data) => {
            console.log('Received user-specific notification:', data);
            displayNotification(data);
        });
        
        socket.on('notification_status_update', (data) => {
            console.log('Notification status updated:', data);
        });
        
        function displayNotification(data) {
            const div = document.getElementById('notifications');
            const notif = document.createElement('div');
            notif.innerHTML = `
                <p><strong>Case:</strong> ${data.notification?.caseNumber || 'N/A'}</p>
                <p><strong>Message:</strong> ${data.notification?.messagePreview || 'N/A'}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
                <hr>
            `;
            div.insertBefore(notif, div.firstChild);
        }
    </script>
</body>
</html>
```

## API Reference

### Apex Methods

#### `WebSocketNotificationService.sendBatchNotifications(List<ChatterNotification__c>)`
- Sends multiple notifications in a single HTTP request
- Used in FeedItemService after creating new notifications

#### `WebSocketNotificationService.sendSingleNotification(ChatterNotification__c)`
- Sends a single notification
- Useful for testing or individual updates

#### `WebSocketNotificationService.sendNotificationUpdateEvent(Set<Id>, String)`
- Sends status update events
- Used when notifications are marked as completed

### REST API Endpoints

#### POST `/api/notifications`
Receives notification data from Salesforce and broadcasts to WebSocket clients.

**Request Body:**
```json
{
  "eventType": "chatter_mention",
  "notifications": [
    {
      "notificationId": "a00XXXXXXXXXXXXXXX",
      "feedItemId": "0D5XXXXXXXXXXXXXXX",
      "caseId": "500XXXXXXXXXXXXXXX",
      "caseNumber": "12345",
      "messagePreview": "You were mentioned...",
      "mentionedUsers": ["005XXXXXXXXXXXXXXX"],
      "timestamp": 1652900000000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification received and broadcasted",
  "timestamp": "2024-05-18T10:30:00.000Z"
}
```

#### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-05-18T10:30:00.000Z",
  "connectedClients": 5
}
```

### WebSocket Events

#### Client → Server Events
- `join_user_room` - Join a user-specific room for targeted notifications
- `leave_user_room` - Leave a user-specific room

#### Server → Client Events
- `salesforce_notification` - Broadcast notification to all clients
- `user_notification` - Targeted notification to specific user
- `notification_status_update` - Notification status change event

## Deployment Options

### Option 1: Heroku
```bash
# Create Heroku app
heroku create your-app-name

# Deploy
git push heroku main

# Scale
heroku ps:scale web=1
```

Update Named Credential URL: `https://your-app-name.herokuapp.com`

### Option 2: Render.com
Use the provided `render.yaml` configuration file.

### Option 3: AWS/Azure/GCP
Deploy using your preferred cloud provider's Node.js hosting service.

## Troubleshooting

### HTTP Callout Fails
1. Check Remote Site Settings or Named Credential configuration
2. Verify WebSocket server is running and accessible
3. Check Salesforce Debug Logs for error messages
4. Test endpoint with Postman/curl

### No WebSocket Updates
1. Verify WebSocket server received the HTTP POST (check logs)
2. Ensure client is connected to WebSocket
3. Check browser console for WebSocket errors
4. Verify client is listening to correct event names

### Named Credential Issues
For testing, you can bypass Named Credential temporarily:
```apex
// In WebSocketNotificationService.cls
private static final String WEBSOCKET_ENDPOINT = 'https://your-ngrok-url.ngrok.io/api/notifications';
```

## Security Considerations

1. **Authentication**: Add authentication to REST API endpoint
2. **HTTPS**: Always use HTTPS in production
3. **API Keys**: Implement API key validation
4. **CORS**: Configure appropriate CORS settings
5. **Rate Limiting**: Add rate limiting to prevent abuse

## Monitoring

Monitor your integration:
- **Salesforce**: Check Debug Logs for HTTP callout status
- **WebSocket Server**: Monitor console logs for incoming requests
- **Clients**: Check browser console for received events

## Next Steps

1. Integrate WebSocket client in your LWC components
2. Update `notificationCenter.js` to listen for WebSocket events
3. Add authentication to WebSocket server
4. Implement message acknowledgment and retry logic
5. Add monitoring and alerting
