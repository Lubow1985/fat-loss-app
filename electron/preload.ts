import { contextBridge } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // Add any methods you need to expose to the renderer process
    // For example:
    // sendMessage: (message: string) => ipcRenderer.send('message', message),
    // onMessage: (callback: (message: string) => void) => {
    //   ipcRenderer.on('message', (event, message) => callback(message));
    // }
  }
); 