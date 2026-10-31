import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'finance-session';
export { COOKIE as FINANCE_COOKIE };
function key() {
  const value = process.env.FINANCE_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Finance session unavailable');
  return value;
}
function signature(value: string) { return createHmac('sha256', key()).update(value).digest('base64url'); }
export function issueFinanceSession(token: string, subject: string) {
  // This only bounds the local session. The trusted identity endpoint MUST verify
  // issuer, audience, JWT signature/expiry, and load the user's CURRENT DB roles.
  const [header, body, mac, extra] = token.split('.');
  const jwtSecret = process.env.FINANCE_CHURCH_JWT_SECRET;
  const issuer = process.env.FINANCE_CHURCH_JWT_ISSUER;
  const audience = process.env.FINANCE_CHURCH_JWT_AUDIENCE;
  if (!audience) throw new Error('JWT audience unavailable');
  if (!header || !body || !mac || extra || !jwtSecret || !issuer) throw new Error('JWT configuration unavailable');
  const metadata = JSON.parse(Buffer.from(header, 'base64url').toString());
  if (metadata.alg !== 'HS256') throw new Error('Invalid JWT algorithm');
  const expected = createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest();
  const actual = Buffer.from(mac, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid JWT signature');
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (claims.iss !== issuer || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf * 1000 > Date.now()))) throw new Error('Invalid JWT issuer');
  if (!(Array.isArray(claims.aud) ? claims.aud.includes(audience) : claims.aud === audience)) throw new Error('Invalid JWT audience');
  const tokenSubject = claims.sub ?? claims.id ?? claims.userId;
  if (tokenSubject !== subject || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) throw new Error('Invalid login token');
  const payload = Buffer.from(JSON.stringify({ token, subject, exp: Math.min(claims.exp * 1000, Date.now() + 8 * 3600000) })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export async function authorizeFinance(cookie?: string) {
  if (!cookie) throw new Error('Unauthorized');
  const [payload, mac, extra] = cookie.split('.');
  if (!payload || !mac || extra) throw new Error('Unauthorized');
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(mac);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Unauthorized');
  const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (!Number.isFinite(session.exp) || session.exp <= Date.now() || typeof session.token !== 'string' || !session.subject) throw new Error('Unauthorized');
  const endpoint = process.env.FINANCE_IDENTITY_URL;
  const roles = process.env.FINANCE_ALLOWED_ROLES?.split(',').map(role => role.trim()).filter(Boolean);
  if (!endpoint || !roles?.length) throw new Error('Identity service unavailable');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Identity service unavailable');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${session.token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Unauthorized');
  const identity = await response.json();
  if (identity.id !== session.subject || !Array.isArray(identity.roles) || !identity.roles.some((role: unknown) => typeof role === 'string' && roles.includes(role))) throw new Error('Forbidden');
}
