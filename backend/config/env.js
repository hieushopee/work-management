import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve('./backend/.env') });

export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV;
export const APP_PASSWORD = process.env.APP_PASSWORD;
export const MY_EMAIL = process.env.MY_EMAIL;
export const CLIENT_URL = process.env.CLIENT_URL;
export const CLIENT_LOGIN_URL = process.env.CLIENT_LOGIN_URL;
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mgmt';
export const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
export const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
export const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;
export const IMAGEKIT_FACE_FOLDER = process.env.IMAGEKIT_FACE_FOLDER || '/Face';
export const IMAGEKIT_MESSAGE_FOLDER = process.env.IMAGEKIT_MESSAGE_FOLDER || '/Messages';
export const IMAGEKIT_CHECKIN_FOLDER = process.env.IMAGEKIT_CHECKIN_FOLDER || '/CheckIn';
export const IMAGEKIT_CHECKOUT_FOLDER = process.env.IMAGEKIT_CHECKOUT_FOLDER || '/CheckOut';
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
