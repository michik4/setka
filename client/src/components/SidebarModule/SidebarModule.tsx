import React, { useState } from 'react';
import { 
  SidebarModuleUnion, 
  SidebarModuleType, 
  GroupInfoModule,
  PageSpecificModule
} from '../../types/SidebarModule';
import { useSidebarModules } from '../../contexts/SidebarModulesContext';
import styles from './SidebarModule.module.css';

interface SidebarModuleProps {
  module: SidebarModuleUnion;
}

const SidebarModule: React.FC<SidebarModuleProps> = ({ module }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toggleModuleVisibility } = useSidebarModules();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const onHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleModuleVisibility(module.id);
  };

  // Определяем, является ли модуль привязанным к странице
  const isPageSpecific = 'isPageSpecific' in module && !!module.isPageSpecific;
  
  // Определяем, может ли модуль выходить за границы блока
  const canOverflow = module.canOverflow === true;
  
  // Определяем тип модуля для отображения в индикаторе
  const getPageName = () => {
    if (module.type === SidebarModuleType.GROUP_INFO) {
      return 'Группа';
    } else if (module.type === SidebarModuleType.PAGE_SPECIFIC) {
      const pageModule = module as PageSpecificModule;
      return pageModule.pageType || 'Страница';
    }
    return 'Страница';
  };

  return (
    <div className={`${styles.moduleContainer} ${isPageSpecific ? styles.pageSpecificModule : ''} ${canOverflow ? styles.overflowModule : ''}`}>
      <div className={styles.moduleHeader} onClick={toggleCollapse}>
        <h3 className={styles.moduleTitle}>
          {module.title}
          {isPageSpecific && (
            <span className={styles.pageIndicator}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              {getPageName()}
            </span>
          )}
          {canOverflow && (
            <span className={styles.overflowIndicator} title="Этот модуль может открывать всплывающие окна">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
              </svg>
            </span>
          )}
        </h3>
        <div className={styles.moduleControls}>
          <button 
            className={styles.controlButton} 
            onClick={onHide} 
            title="Скрыть модуль"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
          <button 
            className={`${styles.controlButton} ${styles.collapseButton} ${isCollapsed ? styles.collapsed : ''}`} 
            title={isCollapsed ? "Развернуть" : "Свернуть"}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/>
            </svg>
          </button>
        </div>
      </div>
      <div className={`${styles.moduleContent} ${isCollapsed ? styles.collapsed : ''} ${canOverflow ? styles.overflowContent : ''}`}>
        {module.component}
      </div>
    </div>
  );
};

export default SidebarModule; 