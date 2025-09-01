import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, InputNumber, Table, Space, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Parameter } from '../../../shared/types';

const { Option } = Select;

const ProfileEditor: React.FC = () => {
  const [form] = Form.useForm();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [connectionType, setConnectionType] = useState<string>('modbus-rtu');

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

  const onFinish = (values: any) => {
    const profile = {
      ...values,
      parameters
    };
    console.log('Сохраняем профиль:', profile);
    message.success('Профиль сохранён');
  };

  return (
    <Card title="Редактор профиля устройства">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          label="Название профиля"
          name="name"
          rules={[{ required: true, message: 'Введите название профиля' }]}
        >
          <Input placeholder="Например: Счётчик электроэнергии" />
        </Form.Item>

        <Form.Item
          label="Тип подключения"
          name="type"
          initialValue="modbus-rtu"
        >
          <Select onChange={setConnectionType}>
            <Option value="modbus-rtu">Modbus RTU</Option>
            <Option value="modbus-tcp">Modbus TCP</Option>
            <Option value="custom">Пользовательский протокол</Option>
          </Select>
        </Form.Item>

        {connectionType === 'modbus-rtu' && (
          <>
            <Form.Item label="COM порт" name="port">
              <Select placeholder="Выберите порт">
                <Option value="COM1">COM1</Option>
                <Option value="COM2">COM2</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Скорость" name="baudRate" initialValue={9600}>
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
            <Form.Item label="IP адрес" name="host">
              <Input placeholder="192.168.1.100" />
            </Form.Item>
            <Form.Item label="Порт" name="tcpPort" initialValue={502}>
              <InputNumber min={1} max={65535} />
            </Form.Item>
          </>
        )}

        <Form.Item label="Unit ID" name="unitId" initialValue={1}>
          <InputNumber min={0} max={255} />
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
          />
        </div>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Сохранить профиль
            </Button>
            <Button>Отмена</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ProfileEditor;