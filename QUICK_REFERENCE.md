# Quick Reference: Apex to WebSocket Integration

## What Was Created

### 1. Apex Classes
- **WebSocketNotificationService.cls** - HTTP callout service to send notifications to WebSocket server
- **Updated FeedItemService.cls** - Integrated WebSocket notifications when creating/updating notifications

### 2. WebSocket Server
- **server-with-rest-api.js** - Enhanced server with REST API endpoint
- **salesforce-notification-client.html** - Test client to monitor notifications
- **Updated package.json** - Added body-parser dependency
- **APEX_INTEGRATION_GUIDE.md** - Complete setup and deployment guide

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Salesforce (Apex)                        │
│                                                             │
│  1. Chatter Post with #QUICKTEXTPOST                       │
│  2. FeedItemService creates ChatterNotification__c         │
│  3. WebSocketNotificationService makes HTTP POST           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP POST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              WebSocket Server (Node.js)                     │
│                                                             │
│  POST /api/notifications                                    │
│  → Receives notification data                               │
│  → Broadcasts via WebSocket                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket Broadcast
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Connected Clients                        │
│                                                             │
│  • LWC Components                                           │
│  • Browser Clients                                          │
│  • Desktop Apps                                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Setup (5 Minutes)

### Step 1: Install Server Dependencies
```bash
cd Work/sf-chat-websocket-server-master-main
npm install
```

### Step 2: Start WebSocket Server
```bash
# Use the new server file
node server-with-rest-api.js

# OR rename it and use normal start
cp server-with-rest-api.js server.js
npm start
```

Server runs on `http://localhost:3000`

### Step 3: Configure Salesforce Named Credential

For **local testing** (use ngrok):
```bash
ngrok http 3000
```

Setup → Named Credentials → New Legacy:
- **Name**: `WebSocket_Server`
- **URL**: Your ngrok URL (e.g., `https://abc123.ngrok.io`)
- **Identity Type**: Anonymous

### Step 4: Deploy Apex Classes
Deploy to Salesforce:
- `WebSocketNotificationService.cls`
- `WebSocketNotificationService.cls-meta.xml`
- Updated `FeedItemService.cls`

### Step 5: Test
1. Open test client: `http://localhost:3000/salesforce-notification-client.html`
2. In Salesforce, create a Chatter post with `#QUICKTEXTPOST` mentioning a user
3. Watch notifications appear in the test client!

## API Endpoints

### WebSocket Server

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notifications` | POST | Receive notifications from Salesforce |
| `/api/health` | GET | Health check |
| `/` | GET | Serve test client |

### Apex Methods

```apex
// Send batch notifications
WebSocketNotificationService.sendBatchNotifications(notificationList);

// Send single notification
WebSocketNotificationService.sendSingleNotification(notification);

// Send status update
WebSocketNotificationService.sendNotificationUpdateEvent(notificationIds, 'Completed');
```

## WebSocket Events

### Server → Client
- `salesforce_notification` - New notification broadcast
- `user_notification` - User-specific notification
- `notification_status_update` - Status changed

### Client → Server
- `join_user_room` - Join user-specific room
- `leave_user_room` - Leave user-specific room

## Testing from Developer Console

```apex
// Create test notification
ChatterNotification__c testNotif = new ChatterNotification__c(
    CaseNumber__c = 'TEST-001',
    MessagePreview__c = 'Test from Apex',
    NotificationType__c = 'Mention',
    Status__c = 'Pending',
    MentionedUsers__c = UserInfo.getUserId(),
    NotificationDateTime__c = System.now()
);
insert testNotif;

// Send to WebSocket
WebSocketNotificationService.sendSingleNotification(testNotif);
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Callout fails | Check Named Credential and Remote Site Settings |
| No WebSocket updates | Verify server is running and client is connected |
| Server errors | Check server console logs |
| Missing body-parser error | Run `npm install` |

## Production Deployment

### Deploy Server to Heroku
```bash
heroku create your-app-name
git push heroku main
```

Update Named Credential URL to: `https://your-app-name.herokuapp.com`

### Security Checklist
- [ ] Add authentication to REST endpoint
- [ ] Use HTTPS only
- [ ] Implement API key validation
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Monitor callout logs

## Files Modified/Created

### Salesforce
```
force-app/main/default/classes/
├── WebSocketNotificationService.cls         (NEW)
├── WebSocketNotificationService.cls-meta.xml (NEW)
└── FeedItemService.cls                       (UPDATED)
```

### WebSocket Server
```
Work/sf-chat-websocket-server-master-main/
├── server-with-rest-api.js                   (NEW)
├── salesforce-notification-client.html       (NEW)
├── APEX_INTEGRATION_GUIDE.md                 (NEW)
├── QUICK_REFERENCE.md                        (NEW)
└── package.json                              (UPDATED)
```

## Next Steps

1. ✅ Basic integration complete
2. 🔄 Update LWC to listen for WebSocket events
3. 🔄 Add authentication
4. 🔄 Deploy to production
5. 🔄 Add monitoring and alerting

## Support

- Check Debug Logs: Setup → Debug Logs
- Check Server Logs: Terminal running Node.js
- Test Endpoint: Use Postman/curl
- Monitor Health: `GET /api/health`
