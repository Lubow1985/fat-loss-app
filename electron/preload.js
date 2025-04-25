"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
// Add any methods you need to expose to the renderer process
// For example:
// sendMessage: (message: string) => ipcRenderer.send('message', message),
// onMessage: (callback: (message: string) => void) => {
//   ipcRenderer.on('message', (event, message) => callback(message));
// }
});
