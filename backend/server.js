import { createServer } from 'http';
import createApp from './app/createApp.js';
import { createSocketServer } from './realtime/socketServer.js';
import { connectDatabase } from './config/database.js';
import { PORT } from './config/env.js';

const app = createApp();
const server = createServer(app);

const { io, getConnectedUserCount } = createSocketServer(server);
app.set('io', io);

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    connectedUsers: getConnectedUserCount(),
  });
});

connectDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Socket.io server is ready for connections');
      const imagekitConfigured = Boolean(
        process.env.IMAGEKIT_PUBLIC_KEY &&
        process.env.IMAGEKIT_PRIVATE_KEY &&
        process.env.IMAGEKIT_URL_ENDPOINT
      );
      console.log('ImageKit configured:', imagekitConfigured);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });

export default server;