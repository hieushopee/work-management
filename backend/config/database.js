import mongoose from 'mongoose';
import { MONGODB_URI } from './env.js';

let connectionPromise;

function hasDatabaseName(uri) {
  return /mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(uri);
}

export function connectDatabase() {
  if (connectionPromise) return connectionPromise;

  mongoose.set('strictQuery', false);
  const options = { serverSelectionTimeoutMS: 5000 };
  if (!hasDatabaseName(MONGODB_URI)) {
    options.dbName = 'mgmt';
  }

  connectionPromise = mongoose
    .connect(MONGODB_URI, options)
    .then((connection) => {
      console.log('MongoDB connected');
      return connection;
    })
    .catch((error) => {
      connectionPromise = null;
      console.error('MongoDB connection error:', error);
      throw error;
    });

  return connectionPromise;
}
