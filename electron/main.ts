import { app, BrowserWindow, protocol } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        devTools: true,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      // Load the Next.js development server
      mainWindow.loadURL('http://localhost:3000');
    } else {
      // Register protocol handler for serving static files
      protocol.registerFileProtocol('app', (request, callback) => {
        let filePath = url.fileURLToPath(
          'file://' + request.url.slice('app://'.length)
        );
        
        // Handle the case where the URL might be encoded
        filePath = decodeURIComponent(filePath);
        
        // If requesting a directory, serve index.html
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
        
        // Map static files to the correct location
        if (filePath.includes('/_next/') || filePath.includes('/static/')) {
          const relativePath = filePath.split('/out/')[1];
          filePath = path.join(app.getAppPath(), 'out', relativePath);
        }
        
        callback(filePath);
      });

      // Load the production build
      const appPath = app.getAppPath();
      console.log('App path:', appPath);
      
      const indexPath = path.join(appPath, 'out', 'index.html');
      console.log('Loading from:', indexPath);
      
      // Load using app protocol
      mainWindow.loadURL('app://' + indexPath);
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Handle failed loads
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
      console.error('App path:', app.getAppPath());
    });

    // Handle navigation
    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (process.env.NODE_ENV === 'development') {
        // Allow navigation within the app in development
        if (url.startsWith('http://localhost:3000')) {
          return;
        }
      }
      // Prevent external navigation
      event.preventDefault();
    });

  } catch (error) {
    console.error('Error creating window:', error);
  }
}

// Wait for the app to be ready
app.whenReady().then(() => {
  console.log('App is ready');
  console.log('App path:', app.getAppPath());
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Recreate window on macOS when dock icon is clicked
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
}); 