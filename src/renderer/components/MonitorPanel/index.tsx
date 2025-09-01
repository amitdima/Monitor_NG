import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Empty, Badge, Table, Tag, Space, Button } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ReloadOutlined,
  ThunderboltOutlined 
} from '@ant-design/icons';
import { Device } from '../../../shared/types';

interface MonitorPanelProps {
  devices: Device[];
}

interface DeviceData {
  deviceId: string;
  deviceName: string;
  parameter: string;
  value: number;
  timestamp: Date;
}

const MonitorPanel: React.FC<MonitorPanelProps> = ({ devices }) => {
  const [deviceData, setDeviceData] = useState<Map<string, DeviceData[]>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      // Подписываемся на получение данных
      const handleDeviceData = (data: any) => {
        console.log('Получены данные в MonitorPanel:', data);
        
        setDeviceData(prev => {
          const newMap = new Map(prev);
          const deviceDataArray = newMap.get(data.deviceId) || [];
          
          // Находим существующий параметр или добавляем новый
          const existingIndex = deviceDataArray.findIndex(d => d.parameter === data.parameter);
          const newData: DeviceData = {
            deviceId: data.deviceId,
            deviceName: data.deviceName,
            parameter: data.parameter,
            value: data.value,
            timestamp: new Date(data.timestamp)
          };
          
          if (existingIndex >= 0) {
            deviceDataArray[existingIndex] = newData;
          } else {
            deviceDataArray.push(newData);
          }
          
          newMap.set(data.deviceId, deviceDataArray);
          return newMap;
        });
        
        setLastUpdate(new Date());
      };

      window.electronAPI.onDeviceData(handleDeviceData);

      // Очистка при размонтировании
      return () => {
        window.electronAPI.removeAllListeners('device-data');
      };
    }
  }, []);

  const handleRefresh = async (deviceId: string) => {
    try {
      const result = await window.electronAPI.readDeviceData(deviceId);
      if (!result.success) {
        console.error('Ошибка чтения данных:', result.error);
      }
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  if (devices.length === 0) {
    return (
      <Empty 
        description="Нет подключенных устройств"
        style={{ marginTop: 100 }}
      >
        <Button type="primary" href="#/devices">
          Добавить устройство
        </Button>
      </Empty>
    );
  }

  const formatValue = (value: number, parameter: string): string => {
    if (typeof value !== 'number') return String(value);
    
    // Форматируем в зависимости от величины
    if (Math.abs(value) < 0.01) {
      return value.toExponential(2);
    } else if (Math.abs(value) < 100) {
      return value.toFixed(2);
    } else if (Math.abs(value) < 10000) {
      return value.toFixed(1);
    } else {
      return value.toFixed(0);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'disconnected': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircleOutlined />;
      case 'disconnected': return <CloseCircleOutlined />;
      case 'error': return <CloseCircleOutlined />;
      default: return null;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>Мониторинг устройств</h2>
        {lastUpdate && (
          <span style={{ color: '#888', fontSize: 12 }}>
            Последнее обновление: {lastUpdate.toLocaleTimeString('ru-RU')}
          </span>
        )}
      </div>
      
      <Row gutter={[16, 16]}>
        {devices.map((device) => {
          const data = deviceData.get(device.id) || [];
          
          return (
            <Col span={24} key={device.id}>
              <Card 
                title={
                  <Space>
                    <span>{device.name}</span>
                    <Tag color={device.type === 'modbus-tcp' ? 'blue' : 'green'}>
                      {device.type.toUpperCase()}
                    </Tag>
                  </Space>
                }
                extra={
                  <Space>
                    <Badge 
                      status={getStatusColor(device.status)} 
                      text={device.status === 'connected' ? 'Подключено' : 
                            device.status === 'error' ? 'Ошибка' : 'Отключено'}
                    />
                    <Button 
                      size="small" 
                      icon={<ReloadOutlined />}
                      onClick={() => handleRefresh(device.id)}
                      disabled={device.status !== 'connected'}
                    >
                      Обновить
                    </Button>
                  </Space>
                }
              >
                {data.length > 0 ? (
                  <Row gutter={[16, 16]}>
                    {data.map((item, index) => (
                      <Col xs={12} sm={8} md={6} lg={4} key={index}>
                        <Card size="small" type="inner">
                          <Statistic
                            title={item.parameter}
                            value={formatValue(item.value, item.parameter)}
                            prefix={<ThunderboltOutlined />}
                            valueStyle={{ fontSize: 20 }}
                          />
                          <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                            {new Date(item.timestamp).toLocaleTimeString('ru-RU')}
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty 
                    description={
                      device.status === 'connected' 
                        ? "Ожидание данных..." 
                        : "Нет данных"
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
                
                {device.status === 'connected' && (
                  <div style={{ marginTop: 16, color: '#888', fontSize: 12 }}>
                    Последнее обновление: {device.lastUpdate ? 
                      new Date(device.lastUpdate).toLocaleString('ru-RU') : 'Нет данных'}
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default MonitorPanel;