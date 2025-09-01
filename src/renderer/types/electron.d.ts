export interface IElectronAPI {
  // Порты
  getSerialPorts: () => Promise<any[]>;
  
  // Устройства
  connectDevice: (profile: any) => Promise<{ success: boolean; error?: string }>;
  disconnectDevice: (deviceId: string) => Promise<{ success: boolean; error?: string }>;
  readDeviceData: (deviceId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  getDevices: () => Promise<{ success: boolean; devices?: any[]; error?: string }>;
  
  // Профили
  saveProfile: (profile: any) => Promise<{ success: boolean; error?: string }>;
  loadProfile: (profileId: string) => Promise<{ success: boolean; profile?: any; error?: string }>;
  getAllProfiles: () => Promise<{ success: boolean; profiles?: any[]; error?: string }>;
  deleteProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>;
  
  // События
  onDeviceData: (callback: (data: any) => void) => void;
  onDeviceError: (callback: (error: any) => void) => void;
  onDeviceStatusChanged: (callback: (status: any) => void) => void;
  onDeviceAdded: (callback: (device: any) => void) => void;
  onDeviceRemoved: (callback: (deviceId: string) => void) => void;
  onMenuAction: (callback: (action: string) => void) => void;
  
  // Удаление слушателей
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}