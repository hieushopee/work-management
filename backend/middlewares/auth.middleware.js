import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '../config/env.js';
import { User } from '../models/user.model.js';

export const protectRoute = async (req, res, next) => {
  const accessToken = req.cookies?.accessToken;
  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized access.' });
  }

  try {
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.userId).populate('teams', 'name');

    if (!user) {
      console.log('User not found in database');
      return res.status(401).json({ error: 'Unauthorized access.' });
    }

    const jsonUser = user.toJSON();
    jsonUser.teamNames = user.teams ? user.teams.map((team) => team.name) : [];
    req.user = jsonUser;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired.' });
    }
    return res.status(401).json({ error: 'Unauthorized access.' });
  }
};

export const ownerRoute = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    return next();
  }
  res.status(403).json({ error: 'Access denied - Owner only' });
};
