"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path = require("path");
var url = require("url");
var fs = require("fs");
var mainWindow = null;
// Scheme must be registered before the app is ready
electron_1.protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);
function createWindow() {
    try {
        mainWindow = new electron_1.BrowserWindow({
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
        }
        else {
            // Register protocol handler for serving static files
            electron_1.protocol.registerFileProtocol('app', function (request, callback) {
                var filePath = url.fileURLToPath('file://' + request.url.slice('app://'.length));
                // Handle the case where the URL might be encoded
                filePath = decodeURIComponent(filePath);
                // If requesting a directory, serve index.html
                if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
                    filePath = path.join(filePath, 'index.html');
                }
                // Map static files to the correct location
                if (filePath.includes('/_next/') || filePath.includes('/static/')) {
                    var relativePath = filePath.split('/out/')[1];
                    filePath = path.join(electron_1.app.getAppPath(), 'out', relativePath);
                }
                callback(filePath);
            });
            // Load the production build
            var appPath = electron_1.app.getAppPath();
            console.log('App path:', appPath);
            var indexPath = path.join(appPath, 'out', 'index.html');
            console.log('Loading from:', indexPath);
            // Load using app protocol
            mainWindow.loadURL('app://' + indexPath);
        }
        // Show window when ready
        mainWindow.once('ready-to-show', function () {
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
        });
        mainWindow.on('closed', function () {
            mainWindow = null;
        });
        // Handle failed loads
        mainWindow.webContents.on('did-fail-load', function (event, errorCode, errorDescription) {
            console.error('Failed to load:', errorCode, errorDescription);
            console.error('App path:', electron_1.app.getAppPath());
        });
        // Handle navigation
        mainWindow.webContents.on('will-navigate', function (event, url) {
            if (process.env.NODE_ENV === 'development') {
                // Allow navigation within the app in development
                if (url.startsWith('http://localhost:3000')) {
                    return;
                }
            }
            // Prevent external navigation
            event.preventDefault();
        });
    }
    catch (error) {
        console.error('Error creating window:', error);
    }
}
// Wait for the app to be ready
electron_1.app.whenReady().then(function () {
    console.log('App is ready');
    console.log('App path:', electron_1.app.getAppPath());
    createWindow();
});
// Quit when all windows are closed
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Recreate window on macOS when dock icon is clicked
electron_1.app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
