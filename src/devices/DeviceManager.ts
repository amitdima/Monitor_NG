import { EventEmitter } from 'events';
import { DeviceProfile, Device } from '../shared/types';
import { ModbusClient } from '../core/protocols/ModbusClient';

export class DeviceManager extends EventEmitter {
  private devices: Map<string, DeviceProfile> = new Map();
  private activeConnections: Map<string, ModbusClient> = new Map();
  private deviceStatuses: Map<string, Device> = new Map();

  constructor() {
    super();
  }

  async addDevice(profile: DeviceProfile): Promise<void> {
    try {
      // Сохраняем профиль устройства
      this.devices.set(profile.id, profile);
      
      // Создаём статус устройства
      const deviceStatus: Device = {
        id: profile.id,
        name: profile.name,
        type: profile.type,
        status: 'disconnected',
        lastUpdate: new Date()
      };
      this.deviceStatuses.set(profile.id, deviceStatus);
      
      // Подключаемся через Modbus
      if (profile.type === 'modbus-rtu' || profile.type === 'modbus-tcp') {
        const modbusClient = new ModbusClient(profile);
        
        // Подписываемся на события
        modbusClient.on('connected', () => {
          console.log(`Устройство ${profile.name} подключено`);
          deviceStatus.status = 'connected';
          deviceStatus.lastUpdate = new Date();
          this.emit('device-status-changed', deviceStatus);
        });
        
        modbusClient.on('disconnected', () => {
          console.log(`Устройство ${profile.name} отключено`);
          deviceStatus.status = 'disconnected';
          deviceStatus.lastUpdate = new Date();
          this.emit('device-status-changed', deviceStatus);
        });
        
        modbusClient.on('data', (data) => {
          console.log(`Данные от ${profile.name}:`, data);
          deviceStatus.lastUpdate = new Date();
          this.emit('device-data', {
            deviceId: profile.id,
            deviceName: profile.name,
            ...data
          });
        });
        
        modbusClient.on('error', (error) => {
          console.error(`Ошибка устройства ${profile.name}:`, error);
          deviceStatus.status = 'error';
          deviceStatus.lastUpdate = new Date();
          this.emit('device-error', {
            deviceId: profile.id,
            deviceName: profile.name,
            error: error.message || error
          });
        });
        
        // Сохраняем клиент
        this.activeConnections.set(profile.id, modbusClient);
        
        // Пытаемся подключиться
        try {
          await modbusClient.connect();
          deviceStatus.status = 'connected';
        } catch (error) {
          deviceStatus.status = 'error';
          throw error;
        }
      }
      
      this.emit('device-added', deviceStatus);
    } catch (error) {
      this.emit('device-error', {
        deviceId: profile.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async removeDevice(deviceId: string): Promise<void> {
    try {
      // Отключаем Modbus соединение
      const modbusClient = this.activeConnections.get(deviceId);
      if (modbusClient) {
        await modbusClient.disconnect();
        this.activeConnections.delete(deviceId);
      }
      
      this.devices.delete(deviceId);
      this.deviceStatuses.delete(deviceId);
      this.emit('device-removed', deviceId);
    } catch (error) {
      this.emit('device-error', {
        deviceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async readDevice(deviceId: string): Promise<any> {
    const device = this.devices.get(deviceId);
    const modbusClient = this.activeConnections.get(deviceId);
    
    if (!device) {
      throw new Error(`Устройство ${deviceId} не найдено`);
    }
    
    if (!modbusClient || !modbusClient.isActive()) {
      throw new Error(`Устройство ${device.name} не подключено`);
    }
    
    try {
      const data = await modbusClient.readAllParameters();
      return { 
        deviceId, 
        deviceName: device.name,
        data: Object.fromEntries(data),
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Ошибка чтения данных: ${error}`);
    }
  }

  async readSingleParameter(deviceId: string, parameterName: string): Promise<any> {
    const device = this.devices.get(deviceId);
    const modbusClient = this.activeConnections.get(deviceId);
    
    if (!device || !modbusClient) {
      throw new Error(`Устройство ${deviceId} не найдено`);
    }
    
    const parameter = device.parameters.find(p => p.name === parameterName);
    if (!parameter) {
      throw new Error(`Параметр ${parameterName} не найден`);
    }
    
    // Читаем один параметр
    const data = await modbusClient.readAllParameters();
    return data.get(parameterName);
  }

  async pauseDevice(deviceId: string): Promise<void> {
    const modbusClient = this.activeConnections.get(deviceId);
    const deviceStatus = this.deviceStatuses.get(deviceId);
    
    if (modbusClient && deviceStatus) {
      modbusClient.stopPolling();
      deviceStatus.status = 'disconnected';
      deviceStatus.lastUpdate = new Date();
      this.emit('device-status-changed', deviceStatus);
    }
  }

  async resumeDevice(deviceId: string): Promise<void> {
    const modbusClient = this.activeConnections.get(deviceId);
    const deviceStatus = this.deviceStatuses.get(deviceId);
    
    if (modbusClient && deviceStatus) {
      modbusClient.startPolling();
      deviceStatus.status = 'connected';
      deviceStatus.lastUpdate = new Date();
      this.emit('device-status-changed', deviceStatus);
    }
  }

  getDevices(): Device[] {
    return Array.from(this.deviceStatuses.values());
  }
  
  getDeviceProfiles(): DeviceProfile[] {
    return Array.from(this.devices.values());
  }
  
  getDeviceStatus(deviceId: string): Device | undefined {
    return this.deviceStatuses.get(deviceId);
  }
  
  isDeviceConnected(deviceId: string): boolean {
    const modbusClient = this.activeConnections.get(deviceId);
    return modbusClient ? modbusClient.isActive() : false;
  }
}