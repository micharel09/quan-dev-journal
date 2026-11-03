// Brocoders env-example setup, with generated secrets required by its production guard.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const backend = fileURLToPath(new URL('../backend/.env', import.meta.url));
const frontend = fileURLToPath(new URL('../frontend/.env.local', import.meta.url));
if (!existsSync(backend)) {
  let env = readFileSync(new URL('../backend/.env.example', import.meta.url), 'utf8');
  for (const key of ['AUTH_JWT_SECRET', 'AUTH_REFRESH_SECRET', 'AUTH_FORGOT_SECRET', 'AUTH_CONFIRM_EMAIL_SECRET']) env = env.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${randomBytes(32).toString('hex')}`);
  writeFileSync(backend, env, { mode: 0o600 });
}
if (!existsSync(frontend)) writeFileSync(frontend, readFileSync(new URL('../frontend/example.env.local', import.meta.url)), { mode: 0o600 });
console.log('Local environment files ready; existing files preserved.');
