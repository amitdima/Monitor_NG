const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Порты
  getSerialPorts: () => ipcRenderer.invoke('get-serial-ports'),
  
  // Устройства
  connectDevice: (profile) => ipcRenderer.invoke('connect-device', profile),
  disconnectDevice: (deviceId) => ipcRenderer.invoke('disconnect-device', deviceId),
  readDeviceData: (deviceId) => ipcRenderer.invoke('read-device-data', deviceId),
  
  // События
  onDeviceData: (callback) => {
    ipcRenderer.on('device-data', (event, data) => callback(data));
  },
  onDeviceError: (callback) => {
    ipcRenderer.on('device-error', (event, error) => callback(error));
  },
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-profile', () => callback('new-profile'));
    ipcRenderer.on('menu-open-profile', () => callback('open-profile'));
  }
});