import React, { useState } from 'react';
import { Card, Form, Input, Button, Select, Switch, InputNumber, message, Space } from 'antd';
import { FolderOpenOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';

const { Option } = Select;

const ArchiveSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [isArchiving, setIsArchiving] = useState(false);

  const onFinish = (values: any) => {
    console.log('Настройки архивирования:', values);
    message.success('Настройки сохранены');
  };

  const toggleArchiving = () => {
    if (isArchiving) {
      setIsArchiving(false);
      message.info('Архивирование остановлено');
    } else {
      setIsArchiving(true);
      message.success('Архивирование запущено');
    }
  };

  return (
    <Card title="Настройки архивирования">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          format: 'csv',
          interval: 10,
          autoStart: false
        }}
      >
        <Form.Item
          label="Путь к файлу"
          name="filePath"
          rules={[{ required: true, message: 'Укажите путь к файлу' }]}
        >
          <Input 
            placeholder="C:\Data\archive.csv" 
            addonAfter={<FolderOpenOutlined />}
          />
        </Form.Item>

        <Form.Item
          label="Формат файла"
          name="format"
        >
          <Select>
            <Option value="csv">CSV</Option>
            <Option value="excel">Excel</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Интервал записи (секунды)"
          name="interval"
        >
          <InputNumber min={1} max={3600} />
        </Form.Item>

        <Form.Item
          label="Автозапуск при подключении"
          name="autoStart"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Сохранить настройки
            </Button>
            <Button 
              danger={isArchiving}
              icon={isArchiving ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={toggleArchiving}
            >
              {isArchiving ? 'Остановить' : 'Начать'} архивирование
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ArchiveSettings;