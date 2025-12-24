import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, NODE_ENV, REFRESH_TOKEN_SECRET } from '../config/env.js';

export const generateTokens = (res, userId) => {
	const accessToken = jwt.sign({ userId }, ACCESS_TOKEN_SECRET, {
		expiresIn: '15m',
	});

	const refreshToken = jwt.sign({ userId }, REFRESH_TOKEN_SECRET, {
		expiresIn: '7d',
	});

	const cookieOptions = {
		httpOnly: true, // prevent XSS attacks, cross site scripting attack
		secure: NODE_ENV === 'production',
		sameSite: NODE_ENV === 'production' ? 'strict' : 'lax', // lax for development to allow navigation
		path: '/', // Ensure cookies are available for all paths
	};
	
	res.cookie('accessToken', accessToken, {
		...cookieOptions,
		maxAge: 15 * 60 * 1000, // 15 minutes
	});
	res.cookie('refreshToken', refreshToken, {
		...cookieOptions,
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});

	console.log('✅ Cookies set for user:', userId, {
		hasAccessToken: !!accessToken,
		hasRefreshToken: !!refreshToken,
		env: NODE_ENV,
	});

	return { accessToken, refreshToken };
};