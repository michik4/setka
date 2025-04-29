import React from 'react';
import { useSidebarModules } from '../../contexts/SidebarModulesContext';
import SidebarModule from '../SidebarModule/SidebarModule';
import './RightSidebar.css';

const RightSidebar: React.FC = () => {
  const { getVisibleModules } = useSidebarModules();
  const modules = getVisibleModules();

  return (
    <div className="right-sidebar-content">
      {modules.length === 0 ? (
        <div className="right-sidebar-empty">
          <p>Нет активных модулей</p>
          <p>Добавьте модули через настройки</p>
        </div>
      ) : (
        modules.map(module => (
          <SidebarModule key={module.id} module={module} />
        ))
      )}
    </div>
  );
};

export default RightSidebar; 