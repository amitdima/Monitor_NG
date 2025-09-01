import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import * as path from 'path';
import { DeviceManager } from '../devices/DeviceManager';
import { ProfileManager } from './services/ProfileManager';

let mainWindow: BrowserWindow | null = null;
let deviceManager: DeviceManager;
let profileManager: ProfileManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  deviceManager = new DeviceManager();
  profileManager = new ProfileManager();
  
  // Подписываемся на события от DeviceManager
  deviceManager.on('device-data', (data) => {
    mainWindow?.webContents.send('device-data', data);
  });
  
  deviceManager.on('device-error', (error) => {
    mainWindow?.webContents.send('device-error', error);
  });
  
  deviceManager.on('device-status-changed', (status) => {
    mainWindow?.webContents.send('device-status-changed', status);
  });
  
  deviceManager.on('device-added', (device) => {
    mainWindow?.webContents.send('device-added', device);
  });
  
  deviceManager.on('device-removed', (deviceId) => {
    mainWindow?.webContents.send('device-removed', deviceId);
  });
  
  const menu = Menu.buildFromTemplate([
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Новый профиль',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-new-profile');
          }
        },
        {
          label: 'Открыть профиль',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-open-profile');
          }
        },
        { type: 'separator' },
        {
          label: 'Выход',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    }
  ]);
  
  Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC обработчики
ipcMain.handle('get-serial-ports', async () => {
  try {
    const { SerialPort } = await import('serialport');
    const ports = await SerialPort.list();
    return ports.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer,
      serialNumber: port.serialNumber,
      pnpId: port.pnpId,
      friendlyName: port.path
    }));
  } catch (error) {
    console.error('Error getting serial ports:', error);
    return [];
  }
});

ipcMain.handle('connect-device', async (event, profile) => {
  try {
    await deviceManager.addDevice(profile);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-device', async (event, deviceId) => {
  try {
    await deviceManager.removeDevice(deviceId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-device-data', async (event, deviceId) => {
  try {
    const data = await deviceManager.readDevice(deviceId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Обработчики для профилей
ipcMain.handle('save-profile', async (event, profile) => {
  try {
    await profileManager.saveProfile(profile);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-profile', async (event, profileId) => {
  try {
    const profile = await profileManager.loadProfile(profileId);
    return { success: true, profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-all-profiles', async () => {
  try {
    const profiles = await profileManager.getAllProfiles();
    return { success: true, profiles };
  } catch (error: any) {
    return { success: false, error: error.message, profiles: [] };
  }
});

ipcMain.handle('delete-profile', async (event, profileId) => {
  try {
    await profileManager.deleteProfile(profileId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Обработчик для получения списка устройств
ipcMain.handle('get-devices', async () => {
  try {
    const devices = deviceManager.getDevices();
    return { success: true, devices };
  } catch (error: any) {
    return { success: false, error: error.message, devices: [] };
  }
});