import { Service } from 'node-windows';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverScript = path.join(rootDir, 'server', 'dist', 'index.js');

const svc = new Service({
  name: 'IBOTS Inventory Server',
  script: serverScript,
});

svc.on('uninstall', () => {
  console.log('✓ IBOTS Inventory Server service uninstalled successfully!');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

console.log('Uninstalling IBOTS Inventory Server Windows Service...');
console.log('Note: This command requires Administrator privileges.');
svc.uninstall();
