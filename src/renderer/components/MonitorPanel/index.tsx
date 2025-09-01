import React from 'react';
import { Card, Row, Col, Statistic, Empty, Badge } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Device } from '../../../shared/types';

interface MonitorPanelProps {
  devices: Device[];
}

const MonitorPanel: React.FC<MonitorPanelProps> = ({ devices }) => {
  if (devices.length === 0) {
    return (
      <Empty 
        description="Нет подключенных устройств"
        style={{ marginTop: 100 }}
      />
    );
  }

  return (
    <div>
      <h2>Мониторинг устройств</h2>
      <Row gutter={[16, 16]}>
        {devices.map((device) => (
          <Col span={8} key={device.id}>
            <Card 
              title={device.name}
              extra={
                <Badge 
                  status={device.status === 'connected' ? 'success' : 'error'} 
                  text={device.status === 'connected' ? 'Подключено' : 'Отключено'}
                />
              }
            >
              <p>Тип: {device.type}</p>
              <p>Последнее обновление: {device.lastUpdate ? new Date(device.lastUpdate).toLocaleString() : 'Нет данных'}</p>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default MonitorPanel;