import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, InputNumber, Table, Space, message, List, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, FileOutlined, EditOutlined } from '@ant-design/icons';
import { Parameter, DeviceProfile } from '../../../shared/types';

const { Option } = Select;

const ProfileEditor: React.FC = () => {
  const [form] = Form.useForm();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [connectionType, setConnectionType] = useState<string>('modbus-rtu');
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

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

  const addParameter = () => {
    const newParam: Parameter = {
      key: Date.now().toString(),
      name: '',
      address: 0,
      type: 'uint16',
      functionCode: 3,
      scale: 1
    };
    setParameters([...parameters, newParam]);
  };

  const removeParameter = (key: string) => {
    setParameters(parameters.filter(p => p.key !== key));
  };

  const updateParameter = (key: string, field: string, value: any) => {
    setParameters(parameters.map(p => 
      p.key === key ? { ...p, [field]: value } : p
    ));
  };

  const handleSaveProfile = async (values: any) => {
    try {
      setLoading(true);
      
      if (parameters.length === 0) {
        message.warning('Добавьте хотя бы один параметр');
        return;
      }

      const invalidParams = parameters.filter(p => !p.name || p.address === undefined);
      if (invalidParams.length > 0) {
        message.warning('Заполните все параметры');
        return;
      }

      const profile: DeviceProfile = {
        id: editingProfile || `profile_${Date.now()}`,
        name: values.name,
        type: values.type,
        connection: {
          port: values.type === 'modbus-rtu' ? values.port : undefined,
          baudRate: values.type === 'modbus-rtu' ? values.baudRate : undefined,
          host: values.type === 'modbus-tcp' ? values.host : undefined,
          tcpPort: values.type === 'modbus-tcp' ? values.tcpPort : undefined,
          unitId: values.unitId,
          timeout: values.timeout || 1000
        },
        parameters: parameters.map(p => ({
          name: p.name,
          address: p.address,
          type: p.type as any,
          functionCode: p.functionCode as 3 | 4,
          scale: p.scale,
          unit: p.unit,
          byteOrder: p.byteOrder as any
        })),
        polling: {
          interval: values.pollInterval || 1000,
          enabled: true
        }
      };

      const result = await window.electronAPI.saveProfile(profile);
      
      if (result.success) {
        message.success(editingProfile ? 'Профиль обновлён' : 'Профиль сохранён');
        handleNewProfile();
        loadProfiles();
      } else {
        message.error(`Ошибка сохранения: ${result.error}`);
      }
    } catch (error: any) {
      message.error(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProfile = async (profileId: string) => {
    try {
      const result = await window.electronAPI.loadProfile(profileId);
      if (result.success && result.profile) {
        const profile = result.profile;
        setEditingProfile(profile.id);
        
        form.setFieldsValue({
          name: profile.name,
          type: profile.type,
          port: profile.connection.port,
          baudRate: profile.connection.baudRate,
          host: profile.connection.host,
          tcpPort: profile.connection.tcpPort,
          unitId: profile.connection.unitId,
          timeout: profile.connection.timeout,
          pollInterval: profile.polling?.interval
        });
        
        setConnectionType(profile.type);
        setParameters(profile.parameters.map((p: any, index: number) => ({
          ...p,
          key: index.toString()
        })));
        
        message.success('Профиль загружен');
      }
    } catch (error: any) {
      message.error(`Ошибка загрузки: ${error.message}`);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    Modal.confirm({
      title: 'Удаление профиля',
      content: 'Вы уверены, что хотите удалить этот профиль?',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await window.electronAPI.deleteProfile(profileId);
          if (result.success) {
            message.success('Профиль удалён');
            if (editingProfile === profileId) {
              handleNewProfile();
            }
            loadProfiles();
          } else {
            message.error(`Ошибка удаления: ${result.error}`);
          }
        } catch (error: any) {
          message.error(`Ошибка: ${error.message}`);
        }
      }
    });
  };

  const handleNewProfile = () => {
    form.resetFields();
    setParameters([]);
    setEditingProfile(null);
    setConnectionType('modbus-rtu');
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      render: (text: string, record: Parameter) => (
        <Input 
          value={text} 
          onChange={(e) => updateParameter(record.key, 'name', e.target.value)}
          placeholder="Название параметра"
        />
      ),
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      width: 100,
      render: (text: number, record: Parameter) => (
        <InputNumber 
          value={text} 
          onChange={(value) => updateParameter(record.key, 'address', value)}
          min={0}
          max={65535}
        />
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      width: 120,
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
      width: 100,
      render: (text: number, record: Parameter) => (
        <Select 
          value={text} 
          onChange={(value) => updateParameter(record.key, 'functionCode', value)}
          style={{ width: '100%' }}
        >
          <Option value={3}>3 (Holding)</Option>
          <Option value={4}>4 (Input)</Option>
        </Select>
      ),
    },
    {
      title: 'Масштаб',
      dataIndex: 'scale',
      width: 100,
      render: (text: number, record: Parameter) => (
        <InputNumber 
          value={text} 
          onChange={(value) => updateParameter(record.key, 'scale', value || 1)}
          min={0.0001}
          max={10000}
          step={0.1}
        />
      ),
    },
    {
      title: 'Единицы',
      dataIndex: 'unit',
      width: 100,
      render: (text: string, record: Parameter) => (
        <Input 
          value={text} 
          onChange={(e) => updateParameter(record.key, 'unit', e.target.value)}
          placeholder="кВт, °C..."
        />
      ),
    },
    {
      title: '',
      width: 50,
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

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <Card 
        title={editingProfile ? "Редактирование профиля" : "Новый профиль"} 
        style={{ flex: 1 }}
        extra={
          <Button onClick={handleNewProfile} icon={<PlusOutlined />}>
            Новый
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveProfile}
        >
          <Form.Item
            label="Название профиля"
            name="name"
            rules={[{ required: true, message: 'Введите название профиля' }]}
          >
            <Input placeholder="Например: Меркурий 230" />
          </Form.Item>

          <Form.Item
            label="Тип подключения"
            name="type"
            initialValue="modbus-rtu"
          >
            <Select onChange={setConnectionType}>
              <Option value="modbus-rtu">Modbus RTU</Option>
              <Option value="modbus-tcp">Modbus TCP</Option>
            </Select>
          </Form.Item>

          {connectionType === 'modbus-rtu' && (
            <>
              <Form.Item label="Скорость по умолчанию" name="baudRate" initialValue={9600}>
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
              <Form.Item label="TCP порт по умолчанию" name="tcpPort" initialValue={502}>
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          <Form.Item label="Unit ID по умолчанию" name="unitId" initialValue={1}>
            <InputNumber min={0} max={255} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Таймаут (мс)" name="timeout" initialValue={1000}>
            <InputNumber min={100} max={10000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Интервал опроса (мс)" name="pollInterval" initialValue={1000}>
            <InputNumber min={100} max={60000} style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <h3>Параметры</h3>
            <Button 
              type="dashed" 
              onClick={addParameter} 
              icon={<PlusOutlined />}
              style={{ marginBottom: 16 }}
            >
              Добавить параметр
            </Button>
            <Table 
              columns={columns} 
              dataSource={parameters} 
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
            />
          </div>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />}
                loading={loading}
              >
                Сохранить профиль
              </Button>
              <Button onClick={handleNewProfile}>
                Очистить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Сохранённые профили" style={{ width: 300 }}>
        <List
          dataSource={profiles}
          renderItem={profile => (
            <List.Item
              actions={[
                <Button 
                  icon={<EditOutlined />} 
                  size="small"
                  onClick={() => handleLoadProfile(profile.id)}
                />,
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small" 
                  danger
                  onClick={() => handleDeleteProfile(profile.id)}
                />
              ]}
            >
              <List.Item.Meta
                avatar={<FileOutlined />}
                title={profile.name}
                description={`${profile.type.toUpperCase()} • ${profile.parameters.length} параметров`}
              />
            </List.Item>
          )}
          locale={{ emptyText: 'Нет сохранённых профилей' }}
        />
      </Card>
    </div>
  );
};

export default ProfileEditor;