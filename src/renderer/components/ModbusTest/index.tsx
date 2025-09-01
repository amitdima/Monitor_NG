import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Space, InputNumber, message, Alert, Table, Tag, Divider } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { DeviceProfile } from '../../../shared/types';

const { Option } = Select;

const ModbusTest: React.FC = () => {
  const [form] = Form.useForm();
  const [ports, setPorts] = useState<any[]>([]);
  const [connectionType, setConnectionType] = useState<'modbus-rtu' | 'modbus-tcp'>('modbus-rtu');
  const [isConnected, setIsConnected] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Загружаем список COM-портов
  useEffect(() => {
    loadSerialPorts();
    
    // Подписываемся на события
    if (window.electronAPI) {
      window.electronAPI.onDeviceData((data: any) => {
        console.log('Получены данные:', data);
        setDeviceData(prev => [...prev, {
          key: Date.now(),
          time: new Date().toLocaleTimeString(),
          parameter: data.parameter,
          value: data.value,
          deviceName: data.deviceName
        }].slice(-20)); // Храним последние 20 записей
      });

      window.electronAPI.onDeviceError((error: any) => {
        message.error(`Ошибка: ${error.error || error}`);
      });
      
      window.electronAPI.onDeviceStatusChanged((status: any) => {
        if (status.id === currentDeviceId) {
          setIsConnected(status.status === 'connected');
          message.info(`Устройство ${status.name}: ${status.status}`);
        }
      });
    }
    
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('device-data');
        window.electronAPI.removeAllListeners('device-error');
        window.electronAPI.removeAllListeners('device-status-changed');
      }
    };
  }, [currentDeviceId]);

  const loadSerialPorts = async () => {
    try {
      const portsList = await window.electronAPI.getSerialPorts();
      setPorts(portsList);
    } catch (error) {
      console.error('Ошибка загрузки портов:', error);
    }
  };

  const handleConnect = async (values: any) => {
    setLoading(true);
    try {
      // Создаём тестовый профиль
      const profile: DeviceProfile = {
        id: `test_${Date.now()}`,
        name: values.deviceName || 'Test Device',
        type: connectionType,
        connection: {
          port: connectionType === 'modbus-rtu' ? values.port : undefined,
          baudRate: connectionType === 'modbus-rtu' ? values.baudRate : undefined,
          host: connectionType === 'modbus-tcp' ? values.host : undefined,
          tcpPort: connectionType === 'modbus-tcp' ? values.tcpPort : undefined,
          unitId: values.unitId,
          timeout: values.timeout || 1000
        },
        parameters: [
          {
            name: 'Test Register 1',
            address: values.testAddress || 0,
            type: 'uint16',
            functionCode: 3,
            scale: 1
          },
          {
            name: 'Test Register 2',
            address: (values.testAddress || 0) + 1,
            type: 'uint16',
            functionCode: 3,
            scale: 1
          }
        ],
        polling: {
          interval: values.pollInterval || 1000,
          enabled: true
        }
      };

      const result = await window.electronAPI.connectDevice(profile);
      
      if (result.success) {
        setCurrentDeviceId(profile.id);
        setIsConnected(true);
        message.success('Подключение установлено!');
      } else {
        message.error(`Ошибка подключения: ${result.error}`);
      }
    } catch (error: any) {
      message.error(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (currentDeviceId) {
      setLoading(true);
      try {
        const result = await window.electronAPI.disconnectDevice(currentDeviceId);
        if (result.success) {
          setIsConnected(false);
          setCurrentDeviceId(null);
          setDeviceData([]);
          message.success('Отключено');
        } else {
          message.error(`Ошибка отключения: ${result.error}`);
        }
      } catch (error: any) {
        message.error(`Ошибка: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReadOnce = async () => {
    if (currentDeviceId && isConnected) {
      try {
        const result = await window.electronAPI.readDeviceData(currentDeviceId);
        if (result.success) {
          message.success('Данные прочитаны');
          console.log('Прочитанные данные:', result.data);
        } else {
          message.error(`Ошибка чтения: ${result.error}`);
        }
      } catch (error: any) {
        message.error(`Ошибка: ${error.message}`);
      }
    }
  };

  const columns = [
    {
      title: 'Время',
      dataIndex: 'time',
      key: 'time',
      width: 100,
    },
    {
      title: 'Параметр',
      dataIndex: 'parameter',
      key: 'parameter',
    },
    {
      title: 'Значение',
      dataIndex: 'value',
      key: 'value',
      render: (value: any) => <Tag color="blue">{value}</Tag>
    },
  ];

  return (
    <div>
      <Card title="Тестирование Modbus подключения" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleConnect}
          initialValues={{
            deviceName: 'Test Device',
            baudRate: 9600,
            unitId: 1,
            timeout: 1000,
            testAddress: 0,
            pollInterval: 1000,
            tcpPort: 502
          }}
        >
          <Form.Item label="Имя устройства" name="deviceName">
            <Input placeholder="Например: Счётчик электроэнергии" />
          </Form.Item>

          <Form.Item label="Тип подключения">
            <Select value={connectionType} onChange={setConnectionType} disabled={isConnected}>
              <Option value="modbus-rtu">Modbus RTU (Serial)</Option>
              <Option value="modbus-tcp">Modbus TCP</Option>
            </Select>
          </Form.Item>

          {connectionType === 'modbus-rtu' && (
            <>
              <Form.Item 
                label="COM порт" 
                name="port"
                rules={[{ required: true, message: 'Выберите порт' }]}
              >
                <Select 
                  placeholder="Выберите порт"
                  disabled={isConnected}
                  dropdownRender={menu => (
                    <>
                      <Space style={{ padding: '4px 8px' }}>
                        <Button size="small" onClick={loadSerialPorts}>
                          <ReloadOutlined /> Обновить
                        </Button>
                      </Space>
                      <Divider style={{ margin: '4px 0' }} />
                      {menu}
                    </>
                  )}
                >
                  {ports.map(port => (
                    <Option key={port.path} value={port.path}>
                      {port.path} {port.manufacturer && `(${port.manufacturer})`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Скорость (бод)" name="baudRate">
                <Select disabled={isConnected}>
                  <Option value={2400}>2400</Option>
                  <Option value={4800}>4800</Option>
                  <Option value={9600}>9600</Option>
                  <Option value={19200}>19200</Option>
                  <Option value={38400}>38400</Option>
                  <Option value={57600}>57600</Option>
                  <Option value={115200}>115200</Option>
                </Select>
              </Form.Item>
            </>
          )}

          {connectionType === 'modbus-tcp' && (
            <>
              <Form.Item 
                label="IP адрес" 
                name="host"
                rules={[{ required: true, message: 'Введите IP адрес' }]}
              >
                <Input placeholder="192.168.1.100" disabled={isConnected} />
              </Form.Item>

              <Form.Item label="TCP порт" name="tcpPort">
                <InputNumber min={1} max={65535} disabled={isConnected} />
              </Form.Item>
            </>
          )}

          <Form.Item label="Unit ID (Slave ID)" name="unitId">
            <InputNumber min={0} max={255} disabled={isConnected} />
          </Form.Item>

          <Form.Item label="Таймаут (мс)" name="timeout">
            <InputNumber min={100} max={10000} disabled={isConnected} />
          </Form.Item>

          <Form.Item label="Тестовый адрес регистра" name="testAddress">
            <InputNumber min={0} max={65535} disabled={isConnected} />
          </Form.Item>

          <Form.Item label="Интервал опроса (мс)" name="pollInterval">
            <InputNumber min={100} max={60000} disabled={isConnected} />
          </Form.Item>

          <Form.Item>
            <Space>
              {!isConnected ? (
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  icon={<PlayCircleOutlined />}
                >
                  Подключить
                </Button>
              ) : (
                <>
                  <Button 
                    danger 
                    onClick={handleDisconnect}
                    loading={loading}
                    icon={<PauseCircleOutlined />}
                  >
                    Отключить
                  </Button>
                  <Button 
                    onClick={handleReadOnce}
                    icon={<ReloadOutlined />}
                  >
                    Прочитать один раз
                  </Button>
                </>
              )}
            </Space>
          </Form.Item>
        </Form>

        {isConnected && (
          <Alert
            message="Подключено"
            description={`Устройство подключено. ID: ${currentDeviceId}`}
            type="success"
            showIcon
          />
        )}
      </Card>

      {deviceData.length > 0 && (
        <Card title="Полученные данные">
          <Table 
            columns={columns} 
            dataSource={deviceData}
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
          />
        </Card>
      )}
    </div>
  );
};

export default ModbusTest;