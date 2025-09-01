import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, InputNumber, message, Divider, Spin, Tabs } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  ReloadOutlined,
  FileOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Device, DeviceProfile, Parameter } from '../../../shared/types';

const { Option } = Select;
const { TabPane } = Tabs;

interface DeviceListProps {
  onDevicesChange: (devices: Device[]) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ onDevicesChange }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingParameters, setEditingParameters] = useState<Parameter[]>([]);
  const [connectionType, setConnectionType] = useState<'modbus-rtu' | 'modbus-tcp' | 'custom' | 'profile'>('modbus-rtu');
  const [ports, setPorts] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [parameters, setParameters] = useState<Parameter[]>([
    {
      key: '1',
      name: '',  // Пустое имя по умолчанию
      address: 17000,
      type: 'uint32',
      functionCode: 3,
      scale: 1,
      registerCount: 2
    }
  ]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDevices();
    loadProfiles();
    loadSerialPorts();

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
    setParameters([
      {
        key: '1',
        name: '',  // Пустое имя
        address: 17000,
        type: 'uint32',
        functionCode: 3,
        scale: 1,
        registerCount: 2
      }
    ]);
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    // Здесь нужно загрузить параметры устройства
    // Пока используем заглушку
    setEditingParameters([
      {
        key: '1',
        name: 'Параметр 1',
        address: 17000,
        type: 'uint32',
        functionCode: 3,
        scale: 1,
        registerCount: 2
      }
    ]);
    setIsEditModalVisible(true);
  };

  const handleTogglePause = async (device: Device) => {
    try {
      if (device.status === 'connected') {
        // Ставим на паузу
        const result = await window.electronAPI.pauseDevice(device.id);
        if (result.success) {
          message.success('Опрос приостановлен');
        } else {
          message.error(`Ошибка: ${result.error}`);
        }
      } else if (device.status === 'disconnected') {
        // Возобновляем опрос
        const result = await window.electronAPI.resumeDevice(device.id);
        if (result.success) {
          message.success('Опрос возобновлён');
        } else {
          message.error(`Ошибка: ${result.error}`);
        }
      }
    } catch (error: any) {
      message.error(`Ошибка: ${error.message}`);
    }
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    Modal.confirm({
      title: 'Удаление устройства',
      content: `Вы уверены, что хотите удалить устройство "${deviceName}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          setLoading(true);
          const result = await window.electronAPI.disconnectDevice(deviceId);
          if (result.success) {
            message.success('Устройство удалено');
            setDevices(prev => prev.filter(d => d.id !== deviceId));
          } else {
            message.error(`Ошибка удаления: ${result.error}`);
          }
        } catch (error: any) {
          message.error(`Ошибка: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const addParameter = () => {
    const newParam: Parameter = {
      key: Date.now().toString(),
      name: '',  // Пустое имя
      address: 0,
      type: 'uint16',
      functionCode: 3,
      scale: 1,
      registerCount: 1
    };
    setParameters([...parameters, newParam]);
  };

  const addEditParameter = () => {
    const newParam: Parameter = {
      key: Date.now().toString(),
      name: '',
      address: 0,
      type: 'uint16',
      functionCode: 3,
      scale: 1,
      registerCount: 1
    };
    setEditingParameters([...editingParameters, newParam]);
  };

  const removeParameter = (key: string) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter(p => p.key !== key));
    } else {
      message.warning('Должен остаться хотя бы один параметр');
    }
  };

  const removeEditParameter = (key: string) => {
    if (editingParameters.length > 1) {
      setEditingParameters(editingParameters.filter(p => p.key !== key));
    } else {
      message.warning('Должен остаться хотя бы один параметр');
    }
  };

  const updateParameter = (key: string, field: string, value: any) => {
    setParameters(parameters.map(p => 
      p.key === key ? { ...p, [field]: value } : p
    ));
  };

  const updateEditParameter = (key: string, field: string, value: any) => {
    setEditingParameters(editingParameters.map(p => 
      p.key === key ? { ...p, [field]: value } : p
    ));
  };

  const handleProfileSelect = async (profileId: string) => {
    setSelectedProfile(profileId);
    if (profileId) {
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        setParameters(profile.parameters.map((p, index) => ({
          key: index.toString(),
          name: p.name,
          address: p.address,
          type: p.type,
          functionCode: p.functionCode || 3,
          scale: p.scale || 1,
          unit: p.unit,
          byteOrder: p.byteOrder,
          registerCount: p.registerCount
        })));
      }
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const invalidParams = parameters.filter(p => !p.name);
      if (invalidParams.length > 0) {
        message.warning('Заполните названия всех параметров');
        setLoading(false);
        return;
      }

      let profile: DeviceProfile;

      if (connectionType === 'profile' && selectedProfile) {
        const selectedProf = profiles.find(p => p.id === selectedProfile);
        if (!selectedProf) {
          throw new Error('Профиль не найден');
        }
        profile = {
          ...selectedProf,
          id: `device_${Date.now()}`,
          name: values.deviceName || selectedProf.name,
        };
      } else {
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
          parameters: parameters.map(p => ({
            name: p.name,
            address: p.address,
            type: p.type as any,
            functionCode: p.functionCode as 3 | 4,
            scale: p.scale || 1,
            unit: p.unit,
            byteOrder: p.byteOrder as any,
            registerCount: p.registerCount
          })),
          polling: {
            interval: values.pollInterval || 1000,
            enabled: values.autoStart !== false
          }
        };
      }

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

  const handleEditModalOk = async () => {
    // Здесь будет логика сохранения изменений параметров
    message.info('Функция редактирования в разработке');
    setIsEditModalVisible(false);
  };

  const parameterColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      render: (text: string, record: Parameter) => (
        <Input 
          value={text} 
          onChange={(e) => updateParameter(record.key, 'name', e.target.value)}
          placeholder="Введите название"
        />
      ),
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      width: 80,
      render: (text: number, record: Parameter) => (
        <InputNumber 
          value={text} 
          onChange={(value) => updateParameter(record.key, 'address', value)}
          min={0}
          max={65535}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Кол-во',
      dataIndex: 'registerCount',
      width: 70,
      render: (text: number, record: Parameter) => (
        <InputNumber 
          value={text || (record.type === 'uint32' || record.type === 'int32' || record.type === 'float' ? 2 : 1)} 
          onChange={(value) => updateParameter(record.key, 'registerCount', value)}
          min={1}
          max={125}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      width: 100,
      render: (text: string, record: Parameter) => (
        <Select 
          value={text} 
          onChange={(value) => updateParameter(record.key, 'type', value)}
          style={{ width: '100%' }}
        >
          <Option value="uint16">uint16</Option>
          <Option value="int16">int16</Option>
          <Option value="uint32">uint32</Option>
          <Option value="int32">int32</Option>
          <Option value="float">float</Option>
        </Select>
      ),
    },
    {
      title: 'Функция',
      dataIndex: 'functionCode',
      width: 70,
      render: (text: number, record: Parameter) => (
        <Select 
          value={text} 
          onChange={(value) => updateParameter(record.key, 'functionCode', value)}
          style={{ width: '100%' }}
        >
          <Option value={3}>3</Option>
          <Option value={4}>4</Option>
        </Select>
      ),
    },
    {
      title: 'Порядок байт',
      dataIndex: 'byteOrder',
      width: 100,
      render: (text: string, record: Parameter) => (
        <Select 
          value={text || 'AB CD'} 
          onChange={(value) => updateParameter(record.key, 'byteOrder', value)}
          style={{ width: '100%' }}
        >
          <Option value="AB CD">AB CD</Option>
          <Option value="BA DC">BA DC</Option>
          <Option value="CD AB">CD AB</Option>
          <Option value="DC BA">DC BA</Option>
        </Select>
      ),
    },
    {
      title: 'Масштаб',
      dataIndex: 'scale',
      width: 80,
      render: (text: number, record: Parameter) => (
        <InputNumber 
          value={text} 
          onChange={(value) => updateParameter(record.key, 'scale', value || 1)}
          min={0.0001}
          max={10000}
          step={0.1}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '',
      width: 40,
      render: (_: any, record: Parameter) => (
        <Button 
          icon={<DeleteOutlined />} 
          danger 
          size="small"
          onClick={() => removeParameter(record.key)}
        />
      ),
    },
  ];

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
            onClick={() => handleTogglePause(record)}
            title={record.status === 'connected' ? 'Приостановить опрос' : 'Возобновить опрос'}
          />
          <Button 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEditDevice(record)}
            title="Редактировать параметры"
          />
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger
            onClick={() => handleDeleteDevice(record.id, record.name)}
            title="Удалить устройство"
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

      {/* Модальное окно добавления устройства */}
      <Modal
        title="Добавление устройства"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        confirmLoading={loading}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Tabs defaultActiveKey="connection">
          <TabPane tab="Подключение" key="connection">
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
                </Select>
              </Form.Item>

              {connectionType === 'profile' ? (
                <Form.Item label="Выберите профиль">
                  <Select 
                    placeholder="Выберите профиль устройства"
                    value={selectedProfile}
                    onChange={handleProfileSelect}
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
          </TabPane>
          
          <TabPane tab={<><SettingOutlined /> Параметры</>} key="parameters" disabled={connectionType === 'profile'}>
            <div>
              <p style={{ marginBottom: 16 }}>
                Настройте параметры (регистры) для чтения с устройства:
              </p>
              <Button 
                type="dashed" 
                onClick={addParameter} 
                icon={<PlusOutlined />}
                style={{ marginBottom: 16 }}
              >
                Добавить параметр
              </Button>
              <Table 
                columns={parameterColumns} 
                dataSource={parameters} 
                pagination={false}
                size="small"
              />
            </div>
          </TabPane>
        </Tabs>
      </Modal>

      {/* Модальное окно редактирования параметров */}
      <Modal
        title={`Редактирование параметров: ${editingDevice?.name}`}
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => setIsEditModalVisible(false)}
        width={800}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <div>
          <Button 
            type="dashed" 
            onClick={addEditParameter} 
            icon={<PlusOutlined />}
            style={{ marginBottom: 16 }}
          >
            Добавить параметр
          </Button>
          <Table 
            columns={parameterColumns.map(col => ({
              ...col,
              render: col.dataIndex === 'name' 
                ? (text: string, record: Parameter) => (
                    <Input 
                      value={text} 
                      onChange={(e) => updateEditParameter(record.key, 'name', e.target.value)}
                      placeholder="Введите название"
                    />
                  )
                : col.dataIndex === 'address'
                ? (text: number, record: Parameter) => (
                    <InputNumber 
                      value={text} 
                      onChange={(value) => updateEditParameter(record.key, 'address', value)}
                      min={0}
                      max={65535}
                      style={{ width: '100%' }}
                    />
                  )
                : col.dataIndex === 'registerCount'
                ? (text: number, record: Parameter) => (
                    <InputNumber 
                      value={text || (record.type === 'uint32' || record.type === 'int32' || record.type === 'float' ? 2 : 1)} 
                      onChange={(value) => updateEditParameter(record.key, 'registerCount', value)}
                      min={1}
                      max={125}
                      style={{ width: '100%' }}
                    />
                  )
                : col.dataIndex === 'type'
                ? (text: string, record: Parameter) => (
                    <Select 
                      value={text} 
                      onChange={(value) => updateEditParameter(record.key, 'type', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="uint16">uint16</Option>
                      <Option value="int16">int16</Option>
                      <Option value="uint32">uint32</Option>
                      <Option value="int32">int32</Option>
                      <Option value="float">float</Option>
                    </Select>
                  )
                : col.dataIndex === 'functionCode'
                ? (text: number, record: Parameter) => (
                    <Select 
                      value={text} 
                      onChange={(value) => updateEditParameter(record.key, 'functionCode', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value={3}>3</Option>
                      <Option value={4}>4</Option>
                    </Select>
                  )
                : col.dataIndex === 'byteOrder'
                ? (text: string, record: Parameter) => (
                    <Select 
                      value={text || 'AB CD'} 
                      onChange={(value) => updateEditParameter(record.key, 'byteOrder', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="AB CD">AB CD</Option>
                      <Option value="BA DC">BA DC</Option>
                      <Option value="CD AB">CD AB</Option>
                      <Option value="DC BA">DC BA</Option>
                    </Select>
                  )
                : col.dataIndex === 'scale'
                ? (text: number, record: Parameter) => (
                    <InputNumber 
                      value={text} 
                      onChange={(value) => updateEditParameter(record.key, 'scale', value || 1)}
                      min={0.0001}
                      max={10000}
                      step={0.1}
                      style={{ width: '100%' }}
                    />
                  )
                : col.title === ''
                ? (_: any, record: Parameter) => (
                    <Button 
                      icon={<DeleteOutlined />} 
                      danger 
                      size="small"
                      onClick={() => removeEditParameter(record.key)}
                    />
                  )
                : col.render
            }))} 
            dataSource={editingParameters} 
            pagination={false}
            size="small"
          />
        </div>
      </Modal>
    </div>
  );
};

export default DeviceList;