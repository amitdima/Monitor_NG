import React, { useState, useEffect } from 'react';
import { Layout, Menu, message, MenuProps } from 'antd';
import {
  DatabaseOutlined,
  SettingOutlined,
  LineChartOutlined,
  SaveOutlined
} from '@ant-design/icons';

// Импортируем компоненты и типы
import { DeviceList, MonitorPanel, ProfileEditor, ArchiveSettings } from './components';
import { Device } from '../shared/types';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const [selectedMenu, setSelectedMenu] = useState('monitor');
  const [devices, setDevices] = useState<Device[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onDeviceData((data: any) => {
        console.log('Получены данные:', data);
      });

      window.electronAPI.onDeviceError((error: any) => {
        message.error(`Ошибка устройства: ${error.message || error.error || 'Неизвестная ошибка'}`);
      });

      window.electronAPI.onMenuAction((action: string) => {
        if (action === 'new-profile') {
          setSelectedMenu('profile');
        }
      });
    }
  }, []);

  const renderContent = () => {
    switch (selectedMenu) {
      case 'monitor':
        return <MonitorPanel devices={devices} />;
      case 'devices':
        return <DeviceList onDevicesChange={setDevices} />;
      case 'profile':
        return <ProfileEditor />;
      case 'archive':
        return <ArchiveSettings />;
      default:
        return <MonitorPanel devices={devices} />;
    }
  };

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    setSelectedMenu(e.key);
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          MDM
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedMenu]}
          onClick={handleMenuClick}
          items={[
            {
              key: 'monitor',
              icon: <LineChartOutlined />,
              label: 'Мониторинг'
            },
            {
              key: 'devices',
              icon: <DatabaseOutlined />,
              label: 'Устройства'
            },
            {
              key: 'profile',
              icon: <SettingOutlined />,
              label: 'Профили'
            },
            {
              key: 'archive',
              icon: <SaveOutlined />,
              label: 'Архивирование'
            }
          ]}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h2>Multi-Device Monitor</h2>
        </Header>
        
        <Content style={{ 
          margin: '24px 16px', 
          padding: 24, 
          background: '#fff',
          borderRadius: 8,
          overflow: 'auto'
        }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;