import { Service } from 'node-windows';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverScript = path.join(rootDir, 'server', 'dist', 'index.js');

if (!fs.existsSync(serverScript)) {
  console.error(`Error: Compiled server script not found at ${serverScript}`);
  console.error('Please run "npm run build" before installing the service.');
  process.exit(1);
}

const svc = new Service({
  name: 'IBOTS Inventory Server',
  description: 'Self-hosted inventory server for FRC Team 2370',
  script: serverScript,
  workingDirectory: rootDir,
  wait: 2,
  grow: 0.25,
  maxRestarts: 5,
});

svc.on('install', () => {
  console.log('✓ IBOTS Inventory Server service installed successfully!');
  console.log('Starting service...');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('IBOTS Inventory Server service is already installed.');
});

svc.on('start', () => {
  console.log('✓ IBOTS Inventory Server service started! Listening on port 80.');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

console.log('Installing IBOTS Inventory Server as a Windows Service...');
console.log('Note: This command requires Administrator privileges.');
svc.install();
