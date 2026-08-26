const { app, BrowserWindow, utilityProcess } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let serverProcess = null;
let mainWindow = null;

function prepareUserData() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'database');
  const uploadsDir = path.join(userDataPath, 'uploads');

  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });

  const targetDb = path.join(dbDir, 'ibots.db');

  if (!fs.existsSync(targetDb)) {
    console.log('Target database does not exist. Initializing seed database...');
    const sourceDbCandidates = [
      path.join(app.getAppPath(), 'prisma', 'ibots.db'),
      path.join(__dirname, '..', 'prisma', 'ibots.db'),
      path.join(process.cwd(), 'prisma', 'ibots.db'),
    ];

    const sourceDb = sourceDbCandidates.find((p) => fs.existsSync(p));
    if (sourceDb) {
      fs.copyFileSync(sourceDb, targetDb);
      console.log(`Copied seed database from ${sourceDb} to ${targetDb}`);
    } else {
      console.warn('No seed database found at candidates:', sourceDbCandidates);
    }
  }

  return {
    dbPath: targetDb,
    uploadsDir: uploadsDir,
  };
}

function startBackendServer(userData) {
  return new Promise((resolve) => {
    const serverScriptCandidates = [
      path.join(app.getAppPath(), 'server', 'dist', 'index.js'),
      path.join(__dirname, '..', 'server', 'dist', 'index.js'),
      path.join(process.cwd(), 'server', 'dist', 'index.js'),
    ];

    const serverScript = serverScriptCandidates.find((p) => fs.existsSync(p));

    if (!serverScript) {
      console.error('Could not find server script at candidates:', serverScriptCandidates);
      resolve(80);
      return;
    }

    console.log(`Starting embedded backend server from ${serverScript}...`);

    const formattedDbUrl = `file:${userData.dbPath.replace(/\\/g, '/')}`;

    serverProcess = utilityProcess.fork(serverScript, [], {
      env: {
        ...process.env,
        PORT: '80',
        DATABASE_URL: formattedDbUrl,
        IMAGE_UPLOAD_DIR: userData.uploadsDir,
      },
    });

    let resolved = false;

    serverProcess.on('message', (msg) => {
      if (msg && msg.type === 'SERVER_STARTED') {
        console.log(`Embedded server started on port ${msg.port}`);
        if (!resolved) {
          resolved = true;
          resolve(msg.port);
        }
      }
    });

    serverProcess.on('exit', (code) => {
      console.warn(`Server process exited with code ${code}`);
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(80);
      }
    }, 3000);
  });
}

async function createWindow() {
  const userData = prepareUserData();
  const activePort = await startBackendServer(userData);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'IBOTS Inventory',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const appUrl = `http://localhost:${activePort}`;
  console.log(`Loading application window at ${appUrl}...`);
  mainWindow.loadURL(appUrl);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {
      console.error('Error stopping server process:', e);
    }
  }
  if (process.platform !== 'darwin') app.quit();
});
