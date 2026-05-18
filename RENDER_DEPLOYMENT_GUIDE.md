# Deploy to Render - Step by Step Guide

## ✅ What Changed

Your **server.js** has been updated with REST API endpoints! It now includes:
- ✅ POST `/api/notifications` - Receive notifications from Salesforce
- ✅ GET `/api/health` - Health check endpoint
- ✅ WebSocket support for real-time updates
- ✅ User room functionality for targeted notifications

## 🚀 Option 1: Deploy to Render (Recommended)

### Prerequisites
- GitHub account
- Render account (free tier available at [render.com](https://render.com))
- Your code in a Git repository

### Step-by-Step Deployment

#### 1. Push Your Code to GitHub

```bash
cd /Users/sandeepdeveloper/Desktop/workspace/work/bitwise/code/org/ServiceVoicePOC/ServiceVoice/Work/sf-chat-websocket-server-master-main

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Add REST API for Salesforce integration"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/websocket-server.git

# Push
git push -u origin main
```

#### 2. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

#### 3. Deploy Using render.yaml (Automatic)

**Method A: Using Blueprint (Easiest)**

1. Log in to Render Dashboard
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click **"Apply"**
6. Wait for deployment (2-3 minutes)
7. Your server will be live at: `https://salesforce-websocket-server.onrender.com`

**Method B: Manual Service Creation**

1. Log in to Render Dashboard
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `salesforce-websocket-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
5. Click **"Create Web Service"**
6. Wait for deployment

#### 4. Get Your Server URL

After deployment, you'll get a URL like:
```
https://salesforce-websocket-server.onrender.com
```

Your endpoints:
- **REST API**: `https://salesforce-websocket-server.onrender.com/api/notifications`
- **Health Check**: `https://salesforce-websocket-server.onrender.com/api/health`
- **WebSocket**: `wss://salesforce-websocket-server.onrender.com`

#### 5. Update Salesforce Named Credential

In Salesforce:
1. Go to **Setup → Named Credentials → WebSocket_Server**
2. Update **URL** to: `https://salesforce-websocket-server.onrender.com`
3. Save

#### 6. Test Your Deployment

```bash
# Test health endpoint
curl https://salesforce-websocket-server.onrender.com/api/health

# Test notification endpoint
curl -X POST https://salesforce-websocket-server.onrender.com/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "chatter_mention",
    "notification": {
      "caseNumber": "TEST-001",
      "messagePreview": "Test notification"
    }
  }'
```

### Environment Variables on Render

Add these in **Environment** tab:
- `NODE_ENV` = `production`
- `PORT` = `10000` (Render uses this port)

## 🖥️ Option 2: Run Locally for Testing

```bash
cd /Users/sandeepdeveloper/Desktop/workspace/work/bitwise/code/org/ServiceVoicePOC/ServiceVoice/Work/sf-chat-websocket-server-master-main

# Install dependencies
npm install

# Start server
npm start
# OR
node server.js
```

Server runs at `http://localhost:3000`

### Test Locally with ngrok

```bash
# In a new terminal
ngrok http 3000

# Use the ngrok URL in Salesforce Named Credential
# Example: https://abc123.ngrok.io
```

## 🔧 Render Configuration Explained

Your `render.yaml` creates two services:

### Service 1: Main Salesforce WebSocket Server
```yaml
- type: web
  name: salesforce-websocket-server  # Your server name
  env: node                          # Node.js environment
  buildCommand: npm install          # Install dependencies
  startCommand: node server.js       # Start command
  healthCheckPath: /api/health       # Health check URL
```

### Service 2: Grid Table Server (Optional)
For the grid table feature if needed separately.

## 📊 Monitor Your Deployment

### Render Dashboard
1. View logs in real-time
2. Check deployment status
3. Monitor resource usage
4. View request metrics

### Logs
```bash
# View logs in Render Dashboard
# Or use Render CLI
render logs -t salesforce-websocket-server
```

## 🔐 Production Best Practices

### 1. Add Authentication

Update `server.js`:
```javascript
// Add API key validation
const API_KEY = process.env.SALESFORCE_API_KEY;

app.post('/api/notifications', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Rest of your code...
});
```

Add to Render environment:
- `SALESFORCE_API_KEY` = `your-secret-key`

### 2. Enable CORS for Specific Origins

```javascript
const io = socketIO(server, {
  cors: {
    origin: "https://yourcompany.my.salesforce.com",
    methods: ["GET", "POST"]
  }
});
```

### 3. Add Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 🐛 Troubleshooting

### Render Deployment Fails

**Issue**: Build fails
- Check `package.json` is in root directory
- Verify Node version compatibility
- Check build logs for errors

**Issue**: Server starts but crashes
- Check start command is correct: `node server.js`
- Verify port is set from environment: `process.env.PORT`
- Check logs for runtime errors

### Salesforce Callout Fails

**Issue**: HTTP callout timeout
- Verify Render service is running
- Check health endpoint: `https://your-app.onrender.com/api/health`
- Ensure Named Credential URL is correct

**Issue**: CORS errors
- Add Salesforce domain to CORS origins
- Check browser console for specific errors

### WebSocket Connection Fails

**Issue**: Can't connect to WebSocket
- Use `wss://` (not `ws://`) for HTTPS
- Check firewall settings
- Verify Socket.IO version compatibility

## 💡 Tips

### Free Tier Limitations
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid tier for production

### Keep Server Active
Add to your code:
```javascript
// Self-ping every 14 minutes to prevent spin-down
setInterval(() => {
  http.get(`http://localhost:${PORT}/api/health`);
}, 14 * 60 * 1000);
```

### Custom Domain
1. Render Dashboard → Your Service
2. Settings → Custom Domain
3. Add your domain
4. Update DNS records
5. Update Salesforce Named Credential

## 📱 Next Steps

1. ✅ Deploy to Render
2. ✅ Update Salesforce Named Credential
3. ✅ Test with real Chatter posts
4. 🔄 Update LWC to listen for WebSocket events
5. 🔄 Add authentication
6. 🔄 Set up monitoring/alerting
7. 🔄 Configure custom domain

## 🆘 Need Help?

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Socket.IO Docs**: https://socket.io/docs/v4/
- **Express Docs**: https://expressjs.com/

## 🎯 Quick Test After Deployment

1. **Health Check**:
   ```
   https://your-app.onrender.com/api/health
   ```
   Should return: `{"status":"healthy","timestamp":"...","connectedClients":0}`

2. **Create Chatter Post** in Salesforce with `#QUICKTEXTPOST`

3. **Check Render Logs** for:
   ```
   Received notification from Salesforce: {...}
   Notification broadcasted to WebSocket clients
   ```

4. **Open Test Client**:
   ```
   https://your-app.onrender.com/salesforce-notification-client.html
   ```

You're all set! 🚀
