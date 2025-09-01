import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, InputNumber, message, Divider, Spin } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  ReloadOutlined,
  FileOutlined 
} from '@ant-design/icons';
import { Device, DeviceProfile } from '../../../shared/types';

const { Option } = Select;

interface DeviceListProps {
  onDevicesChange: (devices: Device[]) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ onDevicesChange }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [connectionType, setConnectionType] = useState<'modbus-rtu' | 'modbus-tcp' | 'custom' | 'profile'>('modbus-rtu');
  const [ports, setPorts] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [form] = Form.useForm();

  // Загружаем устройства и профили при монтировании
  useEffect(() => {
    loadDevices();
    loadProfiles();
    loadSerialPorts();

    // Подписываемся на события устройств
    if (window.electronAPI) {
      window.electronAPI.onDeviceStatusChanged((status: any) => {
        setDevices(prev => prev.map(device => 
          device.id === status.id ? { ...device, ...status } : device
        ));
      });

      window.electronAPI.onDeviceAdded((device: Device) => {
        setDevices(prev => [...prev, device]);
      });

      window.electronAPI.onDeviceRemoved((deviceId: string) => {
        setDevices(prev => prev.filter(d => d.id !== deviceId));
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('device-status-changed');
        window.electronAPI.removeAllListeners('device-added');
        window.electronAPI.removeAllListeners('device-removed');
      }
    };
  }, []);

  // Обновляем родительский компонент при изменении устройств
  useEffect(() => {
    onDevicesChange(devices);
  }, [devices, onDevicesChange]);

  const loadDevices = async () => {
    try {
      const result = await window.electronAPI.getDevices();
      if (result.success && result.devices) {
        setDevices(result.devices);
      }
    } catch (error) {
      console.error('Ошибка загрузки устройств:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const result = await window.electronAPI.getAllProfiles();
      if (result.success && result.profiles) {
        setProfiles(result.profiles);
      }
    } catch (error) {
      console.error('Ошибка загрузки профилей:', error);
    }
  };

  const loadSerialPorts = async () => {
    try {
      const portsList = await window.electronAPI.getSerialPorts();
      setPorts(portsList);
    } catch (error) {
      console.error('Ошибка загрузки портов:', error);
    }
  };

  const handleAddDevice = () => {
    setIsModalVisible(true);
    form.resetFields();
    setConnectionType('modbus-rtu');
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      let profile: DeviceProfile;

      if (connectionType === 'profile' && selectedProfile) {
        // Загружаем выбранный профиль
        const profileResult = await window.electronAPI.loadProfile(selectedProfile);
        if (!profileResult.success || !profileResult.profile) {
          throw new Error('Не удалось загрузить профиль');
        }
        profile = profileResult.profile;
        // Обновляем имя устройства
        profile.name = values.deviceName || profile.name;
        profile.id = `device_${Date.now()}`;
      } else {
        // Создаём новый профиль на основе параметров
        profile = {
          id: `device_${Date.now()}`,
          name: values.deviceName,
          type: connectionType as 'modbus-rtu' | 'modbus-tcp' | 'custom',
          connection: {
            port: connectionType === 'modbus-rtu' ? values.port : undefined,
            baudRate: connectionType === 'modbus-rtu' ? values.baudRate : undefined,
            host: connectionType === 'modbus-tcp' ? values.host : undefined,
            tcpPort: connectionType === 'modbus-tcp' ? values.tcpPort : undefined,
            unitId: values.unitId || 1,
            timeout: values.timeout || 1000
          },
          parameters: [
            // Базовые параметры для тестирования
            {
              name: 'Register 0',
              address: 0,
              type: 'uint16',
              functionCode: 3,
              scale: 1
            },
            {
              name: 'Register 1',
              address: 1,
              type: 'uint16',
              functionCode: 3,
              scale: 1
            }
          ],
          polling: {
            interval: values.pollInterval || 1000,
            enabled: values.autoStart !== false
          }
        };
      }

      // Подключаем устройство
      const result = await window.electronAPI.connectDevice(profile);
      
      if (result.success) {
        message.success(`Устройство "${profile.name}" добавлено`);
        setIsModalVisible(false);
        form.resetFields();
      } else {
        message.error(`Ошибка добавления: ${result.error}`);
      }
    } catch (error: any) {
      message.error(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    Modal.confirm({
      title: 'Удаление устройства',
      content: 'Вы уверены, что хотите удалить это устройство?',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await window.electronAPI.disconnectDevice(deviceId);
          if (result.success) {
            message.success('Устройство удалено');
          } else {
            message.error(`Ошибка удаления: ${result.error}`);
          }
        } catch (error: any) {
          message.error(`Ошибка: ${error.message}`);
        }
      }
    });
  };

  const handleToggleConnection = async (device: Device) => {
    try {
      if (device.status === 'connected') {
        // Отключаем
        await window.electronAPI.disconnectDevice(device.id);
      } else {
        // Подключаем (нужно будет реализовать reconnect)
        message.info('Переподключение в разработке');
      }
    } catch (error: any) {
      message.error(`Ошибка: ${error.message}`);
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: { [key: string]: { color: string; label: string } } = {
          'modbus-tcp': { color: 'blue', label: 'Modbus TCP' },
          'modbus-rtu': { color: 'green', label: 'Modbus RTU' },
          'custom': { color: 'purple', label: 'Пользовательский' }
        };
        const config = typeMap[type] || { color: 'default', label: type };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: { [key: string]: { color: string; label: string } } = {
          'connected': { color: 'green', label: 'Подключено' },
          'disconnected': { color: 'default', label: 'Отключено' },
          'error': { color: 'red', label: 'Ошибка' }
        };
        const config = statusMap[status] || { color: 'default', label: status };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Последнее обновление',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      render: (date: Date) => date ? new Date(date).toLocaleString('ru-RU') : '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Device) => (
        <Space>
          <Button 
            icon={record.status === 'connected' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            size="small"
            onClick={() => handleToggleConnection(record)}
          />
          <Button icon={<EditOutlined />} size="small" disabled />
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger
            onClick={() => handleDeleteDevice(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAddDevice}
        >
          Добавить устройство
        </Button>
      </div>
      
      <Table
        columns={columns}
        dataSource={devices}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="Добавление устройства"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        confirmLoading={loading}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            baudRate: 9600,
            unitId: 1,
            timeout: 1000,
            tcpPort: 502,
            pollInterval: 1000,
            autoStart: true
          }}
        >
          <Form.Item
            label="Название устройства"
            name="deviceName"
            rules={[{ required: true, message: 'Введите название устройства' }]}
          >
            <Input placeholder="Например: Счётчик электроэнергии" />
          </Form.Item>

          <Form.Item label="Способ настройки">
            <Select value={connectionType} onChange={setConnectionType}>
              <Option value="modbus-rtu">Modbus RTU (Serial)</Option>
              <Option value="modbus-tcp">Modbus TCP</Option>
              <Option value="profile">Использовать готовый профиль</Option>
              <Option value="custom" disabled>Пользовательский протокол</Option>
            </Select>
          </Form.Item>

          {connectionType === 'profile' ? (
            <Form.Item
              label="Выберите профиль"
              rules={[{ required: true, message: 'Выберите профиль' }]}
            >
              <Select 
                placeholder="Выберите профиль устройства"
                value={selectedProfile}
                onChange={setSelectedProfile}
              >
                {profiles.map(profile => (
                  <Option key={profile.id} value={profile.id}>
                    <FileOutlined /> {profile.name}
                  </Option>
                ))}
              </Select>
              {profiles.length === 0 && (
                <div style={{ marginTop: 8, color: '#999' }}>
                  Нет сохранённых профилей. Создайте профиль во вкладке "Профили".
                </div>
              )}
            </Form.Item>
          ) : (
            <>
              {connectionType === 'modbus-rtu' && (
                <>
                  <Form.Item
                    label="COM порт"
                    name="port"
                    rules={[{ required: true, message: 'Выберите COM порт' }]}
                  >
                    <Select
                      placeholder="Выберите порт"
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
                    <Select>
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
                    rules={[
                      { required: true, message: 'Введите IP адрес' },
                      { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'Неверный формат IP адреса' }
                    ]}
                  >
                    <Input placeholder="192.168.1.100" />
                  </Form.Item>

                  <Form.Item label="TCP порт" name="tcpPort">
                    <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                </>
              )}

              <Form.Item label="Unit ID (Slave ID)" name="unitId">
                <InputNumber min={0} max={255} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="Таймаут (мс)" name="timeout">
                <InputNumber min={100} max={10000} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="Интервал опроса (мс)" name="pollInterval">
                <InputNumber min={100} max={60000} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceList;