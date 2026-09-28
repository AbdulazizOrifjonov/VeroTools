import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './http-error';

export interface AccessClaims {
  sub: string;
  role: string;
  tv: number;
  typ: 'access';
}

export interface RefreshClaims {
  sub: string;
  jti: string;
  fam: string;
  typ: 'refresh';
}

const ISSUER = 'vero-tools-api';

export function signAccessToken(claims: Omit<AccessClaims, 'typ'>): { token: string; expiresIn: number } {
  const token = jwt.sign({ ...claims, typ: 'access' }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    issuer: ISSUER,
  });
  const decoded = jwt.decode(token) as { exp: number; iat: number };
  return { token, expiresIn: decoded.exp - decoded.iat };
}

export function verifyAccessToken(token: string): AccessClaims {
  try {
    const claims = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: ISSUER }) as AccessClaims;
    if (claims.typ !== 'access') throw new Error('wrong token type');
    return claims;
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) throw new HttpError(401, 'TOKEN_EXPIRED', 'Access token expired');
    throw new HttpError(401, 'TOKEN_INVALID', 'Invalid access token');
  }
}

export function signRefreshToken(claims: Omit<RefreshClaims, 'typ'>, days = env.JWT_REFRESH_TTL_DAYS): string {
  return jwt.sign({ ...claims, typ: 'refresh' }, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${days}d`,
    issuer: ISSUER,
  });
}

export function verifyRefreshToken(token: string): RefreshClaims {
  try {
    const claims = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'], issuer: ISSUER }) as RefreshClaims;
    if (claims.typ !== 'refresh') throw new Error('wrong token type');
    return claims;
  } catch {
    throw new HttpError(401, 'SESSION_EXPIRED', 'Session expired');
  }
}
