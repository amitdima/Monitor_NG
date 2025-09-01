export interface Device {
  id: string;
  name: string;
  type: 'modbus-rtu' | 'modbus-tcp' | 'custom';
  status: 'connected' | 'disconnected' | 'error';
  lastUpdate?: Date;
  connection?: any;
  parameters?: any[];
}

export interface DeviceProfile {
  id: string;
  name: string;
  type: 'modbus-rtu' | 'modbus-tcp' | 'custom';
  connection: {
    // Для Modbus RTU
    port?: string;
    baudRate?: number;
    // Для Modbus TCP
    host?: string;
    tcpPort?: number;
    // Общие
    unitId: number;
    timeout?: number;
  };
  parameters: Array<{
    name: string;
    address: number;
    type: 'uint16' | 'int16' | 'uint32' | 'int32' | 'float' | 'double';
    functionCode?: 3 | 4;
    scale?: number;
    unit?: string;
    byteOrder?: 'BE' | 'LE' | 'BE_SWAP' | 'LE_SWAP';
  }>;
  polling: {
    interval: number;
    enabled: boolean;
  };
  customProtocol?: string;
}

export interface Parameter {
  key: string;
  name: string;
  address: number;
  type: string;
  functionCode: number;
  scale: number;
}