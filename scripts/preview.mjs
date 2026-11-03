// Run the same built-app commands as the adapted Brocoders Playwright webServer harness.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const directory = (name) => fileURLToPath(new URL(`../${name}/`, import.meta.url));
const children = [
  spawn(process.execPath, ['dist/main.js'], { cwd: directory('backend'), env: { ...process.env, NODE_ENV: 'production', APP_HOST: '127.0.0.1' }, stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3000'], { cwd: directory('frontend'), env: { ...process.env, NODE_ENV: 'production' }, stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
for (const child of children) { child.on('error', () => stop(1)); child.on('exit', (code) => { if (!stopping) stop(code || 1); }); }
