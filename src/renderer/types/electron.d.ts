export interface IElectronAPI {
  getSerialPorts: () => Promise<any[]>;
  connectDevice: (profile: any) => Promise<{ success: boolean; error?: string }>;
  disconnectDevice: (deviceId: string) => Promise<{ success: boolean; error?: string }>;
  readDeviceData: (deviceId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  onDeviceData: (callback: (data: any) => void) => void;
  onDeviceError: (callback: (error: any) => void) => void;
  onMenuAction: (callback: (action: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}