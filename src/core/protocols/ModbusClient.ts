import ModbusRTU from 'modbus-serial';
import { EventEmitter } from 'events';
import { DeviceProfile } from '../../shared/types';

export interface ModbusValue {
  address: number;
  value: number | number[];
  timestamp: Date;
}

export class ModbusClient extends EventEmitter {
  private client: ModbusRTU;
  private isConnected: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private profile: DeviceProfile;

  constructor(profile: DeviceProfile) {
    super();
    this.profile = profile;
    this.client = new ModbusRTU();
  }

  async connect(): Promise<void> {
    try {
      if (this.profile.type === 'modbus-rtu') {
        await this.client.connectRTUBuffered(
          this.profile.connection.port!,
          {
            baudRate: this.profile.connection.baudRate || 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none'
          }
        );
      } else if (this.profile.type === 'modbus-tcp') {
        await this.client.connectTCP(
          this.profile.connection.host!,
          {
            port: this.profile.connection.tcpPort || 502
          }
        );
      }

      this.client.setID(this.profile.connection.unitId);
      this.client.setTimeout(this.profile.connection.timeout || 1000);
      
      this.isConnected = true;
      this.emit('connected');
      
      if (this.profile.polling?.enabled) {
        this.startPolling();
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    if (this.isConnected && this.client) {
      return new Promise((resolve) => {
        this.client.close(() => {
          this.isConnected = false;
          this.emit('disconnected');
          resolve();
        });
      });
    }
  }

  private startPolling(): void {
    if (this.pollInterval) {
      return;
    }

    const interval = this.profile.polling?.interval || 1000;
    
    this.pollInterval = setInterval(async () => {
      try {
        await this.readAllParameters();
      } catch (error) {
        this.emit('error', error);
      }
    }, interval);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Публичные методы для управления опросом
  public startPolling(): void {
    this.startPolling();
  }

  public stopPolling(): void {
    this.stopPolling();
  }

  async readAllParameters(): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    for (const param of this.profile.parameters) {
      try {
        const value = await this.readParameter(param);
        results.set(param.name, value);
        
        this.emit('data', {
          parameter: param.name,
          value,
          timestamp: new Date()
        });
      } catch (error) {
        this.emit('error', {
          parameter: param.name,
          error
        });
      }
    }
    
    return results;
  }

  private async readParameter(param: any): Promise<any> {
    let rawValue: number | number[];
    
    // Определяем количество регистров для чтения
    const count = param.registerCount || this.getRegisterCount(param.type);
    
    // Читаем данные в зависимости от функции
    if (param.functionCode === 3) {
      const result = await this.client.readHoldingRegisters(param.address, count);
      rawValue = result.data;
    } else if (param.functionCode === 4) {
      const result = await this.client.readInputRegisters(param.address, count);
      rawValue = result.data;
    } else {
      throw new Error(`Неподдерживаемый код функции: ${param.functionCode}`);
    }
    
    // Преобразуем значение в зависимости от типа
    const value = this.convertValue(rawValue, param.type, param.byteOrder);
    
    // Применяем масштабирование
    const scaledValue = param.scale ? value * param.scale : value;
    
    return scaledValue;
  }

  private getRegisterCount(type: string): number {
    switch (type) {
      case 'uint16':
      case 'int16':
        return 1;
      case 'uint32':
      case 'int32':
      case 'float':
        return 2;
      case 'double':
        return 4;
      default:
        return 1;
    }
  }

  private convertValue(raw: number | number[], type: string, byteOrder?: string): number {
    const registers = Array.isArray(raw) ? raw : [raw];
    
    switch (type) {
      case 'uint16':
        return registers[0];
      
      case 'int16':
        return this.toInt16(registers[0]);
      
      case 'uint32':
        return this.toUint32(registers, byteOrder);
      
      case 'int32':
        return this.toInt32(registers, byteOrder);
      
      case 'float':
        return this.toFloat32(registers, byteOrder);
      
      default:
        return registers[0];
    }
  }

  private toInt16(value: number): number {
    return value > 32767 ? value - 65536 : value;
  }

  private toUint32(registers: number[], byteOrder?: string): number {
    if (registers.length < 2) return registers[0] || 0;
    
    // AB CD - Big Endian (стандартный Modbus)
    // BA DC - Little Endian 
    // CD AB - Big Endian с перестановкой слов
    // DC BA - Little Endian с перестановкой слов
    
    switch (byteOrder) {
      case 'BE':     // AB CD - стандартный порядок
      case 'AB CD':
        return (registers[0] << 16) | registers[1];
        
      case 'LE':     // BA DC - обратный порядок байт в словах
      case 'BA DC':
        // Меняем байты в каждом слове
        const r0_swapped = ((registers[0] & 0xFF) << 8) | ((registers[0] >> 8) & 0xFF);
        const r1_swapped = ((registers[1] & 0xFF) << 8) | ((registers[1] >> 8) & 0xFF);
        return (r0_swapped << 16) | r1_swapped;
        
      case 'BE_SWAP': // CD AB - меняем слова местами
      case 'CD AB':
        return (registers[1] << 16) | registers[0];
        
      case 'LE_SWAP': // DC BA - меняем слова и байты
      case 'DC BA':
        // Меняем слова местами и байты в каждом слове
        const r0_swap = ((registers[0] & 0xFF) << 8) | ((registers[0] >> 8) & 0xFF);
        const r1_swap = ((registers[1] & 0xFF) << 8) | ((registers[1] >> 8) & 0xFF);
        return (r1_swap << 16) | r0_swap;
        
      default:
        return (registers[0] << 16) | registers[1];
    }
  }

  private toInt32(registers: number[], byteOrder?: string): number {
    const uint32 = this.toUint32(registers, byteOrder);
    return uint32 > 2147483647 ? uint32 - 4294967296 : uint32;
  }

  private toFloat32(registers: number[], byteOrder?: string): number {
    if (registers.length < 2) return 0;
    
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    
    // Получаем байты из регистров
    const b0 = (registers[0] >> 8) & 0xFF;  // Старший байт первого регистра
    const b1 = registers[0] & 0xFF;          // Младший байт первого регистра
    const b2 = (registers[1] >> 8) & 0xFF;  // Старший байт второго регистра
    const b3 = registers[1] & 0xFF;          // Младший байт второго регистра
    
    // Раскладываем байты в зависимости от порядка
    switch (byteOrder) {
      case 'BE':     // AB CD - IEEE 754 Big Endian
      case 'AB CD':
        bytes[0] = b0;
        bytes[1] = b1;
        bytes[2] = b2;
        bytes[3] = b3;
        return view.getFloat32(0, false);
        
      case 'LE':     // BA DC - байты переставлены в словах
      case 'BA DC':
        bytes[0] = b1;
        bytes[1] = b0;
        bytes[2] = b3;
        bytes[3] = b2;
        return view.getFloat32(0, false);
        
      case 'BE_SWAP': // CD AB - слова переставлены
      case 'CD AB':
        bytes[0] = b2;
        bytes[1] = b3;
        bytes[2] = b0;
        bytes[3] = b1;
        return view.getFloat32(0, false);
        
      case 'LE_SWAP': // DC BA - полная перестановка
      case 'DC BA':
        bytes[0] = b3;
        bytes[1] = b2;
        bytes[2] = b1;
        bytes[3] = b0;
        return view.getFloat32(0, false);
        
      default:
        bytes[0] = b0;
        bytes[1] = b1;
        bytes[2] = b2;
        bytes[3] = b3;
        return view.getFloat32(0, false);
    }
  }

  isActive(): boolean {
    return this.isConnected;
  }
}