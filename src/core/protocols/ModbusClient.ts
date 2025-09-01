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
        // Подключение через COM-порт
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
        // Подключение через TCP
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
      
      // Запускаем опрос, если включен
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
      this.client.close(() => {
        this.isConnected = false;
        this.emit('disconnected');
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
    
    // Читаем данные в зависимости от функции
    if (param.functionCode === 3) {
      // Holding Registers
      const count = this.getRegisterCount(param.type);
      const result = await this.client.readHoldingRegisters(param.address, count);
      rawValue = result.data;
    } else if (param.functionCode === 4) {
      // Input Registers
      const count = this.getRegisterCount(param.type);
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
    if (byteOrder === 'LE' || byteOrder === 'LE_SWAP') {
      return registers[1] * 65536 + registers[0];
    }
    return registers[0] * 65536 + registers[1];
  }

  private toInt32(registers: number[], byteOrder?: string): number {
    const uint32 = this.toUint32(registers, byteOrder);
    return uint32 > 2147483647 ? uint32 - 4294967296 : uint32;
  }

  private toFloat32(registers: number[], byteOrder?: string): number {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    
    if (byteOrder === 'LE' || byteOrder === 'LE_SWAP') {
      view.setUint16(0, registers[1], false);
      view.setUint16(2, registers[0], false);
    } else {
      view.setUint16(0, registers[0], false);
      view.setUint16(2, registers[1], false);
    }
    
    return view.getFloat32(0, byteOrder?.startsWith('LE'));
  }

  isActive(): boolean {
    return this.isConnected;
  }
}