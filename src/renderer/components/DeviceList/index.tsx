import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Device } from '../../../shared/types';

interface DeviceListProps {
  onDevicesChange: (devices: Device[]) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ onDevicesChange }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

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
        const color = type === 'modbus-tcp' ? 'blue' : 'green';
        return <Tag color={color}>{type.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'connected' ? 'green' : status === 'error' ? 'red' : 'default';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Device) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" />
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Space>
      ),
    },
  ];

  // Обновляем родительский компонент при изменении устройств
  useEffect(() => {
    onDevicesChange(devices);
  }, [devices, onDevicesChange]);

  const handleAddDevice = () => {
    // Заглушка для добавления устройства
    const newDevice: Device = {
      id: Date.now().toString(),
      name: `Устройство ${devices.length + 1}`,
      type: 'modbus-rtu',
      status: 'disconnected'
    };
    setDevices([...devices, newDevice]);
  };

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
    </div>
  );
};

export default DeviceList;