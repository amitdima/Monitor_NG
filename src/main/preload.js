const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Порты
  getSerialPorts: () => ipcRenderer.invoke('get-serial-ports'),
  
  // Устройства
  connectDevice: (profile) => ipcRenderer.invoke('connect-device', profile),
  disconnectDevice: (deviceId) => ipcRenderer.invoke('disconnect-device', deviceId),
  readDeviceData: (deviceId) => ipcRenderer.invoke('read-device-data', deviceId),
  getDevices: () => ipcRenderer.invoke('get-devices'),
  
  // Профили
  saveProfile: (profile) => ipcRenderer.invoke('save-profile', profile),
  loadProfile: (profileId) => ipcRenderer.invoke('load-profile', profileId),
  getAllProfiles: () => ipcRenderer.invoke('get-all-profiles'),
  deleteProfile: (profileId) => ipcRenderer.invoke('delete-profile', profileId),
  
  // События
  onDeviceData: (callback) => {
    ipcRenderer.on('device-data', (event, data) => callback(data));
  },
  onDeviceError: (callback) => {
    ipcRenderer.on('device-error', (event, error) => callback(error));
  },
  onDeviceStatusChanged: (callback) => {
    ipcRenderer.on('device-status-changed', (event, status) => callback(status));
  },
  onDeviceAdded: (callback) => {
    ipcRenderer.on('device-added', (event, device) => callback(device));
  },
  onDeviceRemoved: (callback) => {
    ipcRenderer.on('device-removed', (event, deviceId) => callback(deviceId));
  },
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-profile', () => callback('new-profile'));
    ipcRenderer.on('menu-open-profile', () => callback('open-profile'));
  },
  
  // Удаление слушателей
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});