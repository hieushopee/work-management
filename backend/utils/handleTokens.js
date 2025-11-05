import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, NODE_ENV, REFRESH_TOKEN_SECRET } from '../config/env.js';

export const generateTokens = (res, userId) => {
	const accessToken = jwt.sign({ userId }, ACCESS_TOKEN_SECRET, {
		expiresIn: '15m',
	});

	const refreshToken = jwt.sign({ userId }, REFRESH_TOKEN_SECRET, {
		expiresIn: '7d',
	});

	res.cookie('accessToken', accessToken, {
		httpOnly: true, // prevent XSS attacks, cross site scripting attack
		secure: NODE_ENV === 'production',
		sameSite: 'strict', // more permissive for development
		maxAge: 15 * 60 * 1000, // 15 minutes
	});
	res.cookie('refreshToken', refreshToken, {
		httpOnly: true, // prevent XSS attacks, cross site scripting attack
		secure: NODE_ENV === 'production',
		sameSite: 'strict', // more permissive for development
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});

	return { accessToken, refreshToken };
};