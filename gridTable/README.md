# Real-Time Collaborative Grid Table

A WebSocket-based collaborative grid table application where multiple clients can simultaneously add, edit, and delete rows with real-time synchronization.

## Architecture

### Server ([server/server.js](server/server.js))
- Listens for events: `rowAdded`, `rowEdited`, `rowDeleted`
- Broadcasts changes to all connected clients (except sender)
- Handles data synchronization for new clients
- Tracks connected client count

### Client ([client/index.html](client/index.html))
- Interactive grid table with dummy employee data
- **Add**: Click "Add New Row" button
- **Edit**: Click any cell to edit inline
- **Delete**: Click delete button on any row
- Shows connection status and connected client count
- Displays notifications for all changes

## How It Works

### 1. Client Makes a Change
```javascript
// Example: Adding a row
socket.emit('rowAdded', newRowData);
```

### 2. Server Receives Event
```javascript
socket.on('rowAdded', (data) => {
  // Broadcast to all OTHER clients
  socket.broadcast.emit('rowAdded', data);
});
```

### 3. Other Clients Receive & Update
```javascript
socket.on('rowAdded', (rowData) => {
  // Add to local data and re-render table
  gridData.push(rowData);
  renderTable();
});
```

## Deployment

### Deploy to Render.com (Recommended)

1. **Push code to GitHub** (if not already)
2. Go to https://render.com
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render auto-detects [render.yaml](render.yaml) configuration
6. Click "Create Web Service"
7. Once deployed, visit your URL (e.g., `https://your-app.onrender.com`)

**Render Configuration:**
- Build Command: `cd server && npm install`
- Start Command: `cd server && node server.js`
- Auto-deploys on git push

### Local Setup & Run

#### Install Dependencies
```bash
cd server
npm install
```

#### Start Server
```bash
npm start
```
Server runs on `http://localhost:3001`

#### Open Multiple Clients
1. Open `http://localhost:3001` in browser tab 1
2. Open `http://localhost:3001` in browser tab 2
3. Open `http://localhost:3001` in browser tab 3

#### Test Real-Time Sync
1. In Tab 1: Click "Add New Row" → All tabs see new row
2. In Tab 2: Edit a cell → All tabs see the update
3. In Tab 3: Delete a row → All tabs see deletion

## Events Reference

| Event | Direction | Data | Purpose |
|-------|-----------|------|---------|
| `rowAdded` | Client → Server → Clients | `{ id, name, email, department, salary }` | Notify of new row |
| `rowEdited` | Client → Server → Clients | `{ id, name, email, department, salary }` | Notify of row update |
| `rowDeleted` | Client → Server → Clients | `{ id }` | Notify of row deletion |
| `requestDataSync` | Client → Server → Clients | `{ socketId }` | Request initial data |
| `syncDataResponse` | Client → Server → Client | `{ targetSocketId, rows }` | Send data to new client |
| `clientCount` | Server → Clients | `number` | Update connected clients |

## Features

✅ Real-time bidirectional communication  
✅ Multiple concurrent clients  
✅ Inline cell editing  
✅ Add/Delete rows  
✅ Visual notifications  
✅ Connection status indicator  
✅ Client count tracking  
✅ Data synchronization for new clients  
✅ Row highlighting on updates  

## Technology Stack

- **Backend**: Node.js + Express + Socket.io 2.3.0
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Protocol**: WebSocket (Socket.io)
