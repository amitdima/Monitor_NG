import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';

// Временно закомментируем, пока не исправим
// import { DeviceManager } from '../core/devices/DeviceManager';

let mainWindow: BrowserWindow | null = null;
// let deviceManager: DeviceManager;

// Временный класс-заглушка
class DeviceManager {
  private devices = new Map();
  
  async addDevice(profile: any) {
    this.devices.set(profile.id, profile);
  }
  
  async removeDevice(deviceId: string) {
    this.devices.delete(deviceId);
  }
  
  async readDevice(deviceId: string) {
    return { deviceId, data: {}, timestamp: new Date() };
  }
  
  on(event: string, callback: Function) {
    // Заглушка
  }
}

let deviceManager: DeviceManager;

// Остальной код остаётся тем же...
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