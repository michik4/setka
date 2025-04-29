import React, { useState } from 'react';
import { useSidebarModules } from '../../contexts/SidebarModulesContext';
import { SidebarModuleType, SidebarModuleUnion } from '../../types/SidebarModule';
import styles from './ModuleManager.module.css';

const ModuleManager: React.FC = () => {
  const { 
    modules, 
    addModule, 
    removeModule, 
    updateModule, 
    toggleModuleVisibility,
    reorderModules
  } = useSidebarModules();
  
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleType, setNewModuleType] = useState<SidebarModuleType>(SidebarModuleType.CUSTOM);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  
  // Обработчик для добавления нового модуля
  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    
    const newModule: SidebarModuleUnion = {
      id: `module-${Date.now()}`,
      type: newModuleType,
      title: newModuleTitle,
      component: null, // Компонент будет установлен контекстом
      isVisible: true,
      order: modules.length + 1,
      settings: newModuleType === SidebarModuleType.CUSTOM ? { description: 'Пользовательский модуль' } : undefined
    } as SidebarModuleUnion;
    
    addModule(newModule);
    setNewModuleTitle('');
  };
  
  // Обработчик для перемещения модуля вверх или вниз
  const handleReorder = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      reorderModules(index, index - 1);
    } else if (direction === 'down' && index < modules.length - 1) {
      reorderModules(index, index + 1);
    }
  };
  
  // Обработчик для переключения видимости модуля
  const handleToggleVisibility = (id: string) => {
    toggleModuleVisibility(id);
  };
  
  // Обработчик для удаления модуля
  const handleRemoveModule = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот модуль?')) {
      removeModule(id);
    }
  };
  
  // Начать редактирование модуля
  const startEditing = (id: string) => {
    setEditingModuleId(id);
  };
  
  // Сохранить изменения в модуле
  const saveModuleChanges = (id: string, newTitle: string) => {
    if (newTitle.trim()) {
      updateModule(id, { title: newTitle });
    }
    setEditingModuleId(null);
  };
  
  // Получаем сортированный список модулей
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  
  return (
    <div className={styles.moduleManager}>
      <h2 className={styles.title}>Управление модулями сайдбара</h2>
      
      {/* Форма добавления нового модуля */}
      <div className={styles.addModuleForm}>
        <input
          type="text"
          placeholder="Название нового модуля"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          className={styles.input}
        />
        <select 
          value={newModuleType} 
          onChange={(e) => setNewModuleType(e.target.value as SidebarModuleType)}
          className={styles.select}
        >
          <option value={SidebarModuleType.CUSTOM}>Пользовательский</option>
          <option value={SidebarModuleType.PLAYER}>Плеер</option>
          <option value={SidebarModuleType.POST_CREATOR}>Создание поста</option>
          <option value={SidebarModuleType.GROUP_MANAGER}>Управление группами</option>
        </select>
        <button 
          onClick={handleAddModule}
          className={styles.button}
          disabled={!newModuleTitle.trim()}
        >
          Добавить
        </button>
      </div>
      
      {/* Список модулей */}
      <div className={styles.modulesList}>
        {sortedModules.length === 0 ? (
          <p className={styles.emptyMessage}>Нет модулей. Добавьте новый модуль выше.</p>
        ) : (
          sortedModules.map((module, index) => (
            <div key={module.id} className={`${styles.moduleItem} ${!module.isVisible ? styles.hidden : ''}`}>
              {editingModuleId === module.id ? (
                <div className={styles.editingContainer}>
                  <input
                    type="text"
                    defaultValue={module.title}
                    autoFocus
                    className={styles.editInput}
                    onBlur={(e) => saveModuleChanges(module.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveModuleChanges(module.id, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingModuleId(null);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className={styles.moduleInfo}>
                  <span className={styles.moduleType}>{module.type}</span>
                  <span className={styles.moduleTitle} onClick={() => startEditing(module.id)}>
                    {module.title}
                  </span>
                </div>
              )}
              <div className={styles.moduleActions}>
                <button 
                  className={`${styles.actionButton} ${styles.visibilityButton} ${!module.isVisible ? styles.hidden : ''}`}
                  onClick={() => handleToggleVisibility(module.id)}
                  title={module.isVisible ? "Скрыть" : "Показать"}
                >
                  {module.isVisible ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
                <button 
                  className={`${styles.actionButton} ${styles.moveUpButton} ${index === 0 ? styles.disabled : ''}`}
                  onClick={() => handleReorder(index, 'up')}
                  disabled={index === 0}
                  title="Переместить вверх"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                  </svg>
                </button>
                <button 
                  className={`${styles.actionButton} ${styles.moveDownButton} ${index === sortedModules.length - 1 ? styles.disabled : ''}`}
                  onClick={() => handleReorder(index, 'down')}
                  disabled={index === sortedModules.length - 1}
                  title="Переместить вниз"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                  </svg>
                </button>
                <button 
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => handleRemoveModule(module.id)}
                  title="Удалить"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ModuleManager; 