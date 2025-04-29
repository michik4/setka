import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  SidebarModuleType, 
  SidebarModuleUnion,
  SidebarModule,
  PlayerModule,
  PostCreatorModule,
  GroupManagerModule,
  GroupInfoModule,
  QueueManagerModule,
  CustomModule
} from '../types/SidebarModule';
import ContentMiniPlayer from '../components/ContentMiniPlayer/ContentMiniPlayer';
import QueueManager from '../components/QueueManager';

interface SidebarModulesContextType {
  modules: SidebarModuleUnion[];
  addModule: (module: SidebarModuleUnion) => void;
  removeModule: (id: string) => void;
  updateModule: (id: string, moduleData: Partial<Omit<SidebarModule, 'type'>>) => void;
  toggleModuleVisibility: (id: string) => void;
  reorderModules: (startIndex: number, endIndex: number) => void;
  getVisibleModules: () => SidebarModuleUnion[];
  addGroupInfoModule: (groupId: number) => string;
  removeGroupInfoModule: () => void;
  hasGroupInfoModule: () => boolean;
}

const SidebarModulesContext = createContext<SidebarModulesContextType | undefined>(undefined);

interface SidebarModulesProviderProps {
  children: ReactNode;
}

export const SidebarModulesProvider: React.FC<SidebarModulesProviderProps> = ({ children }) => {
  // Начальное состояние с дефолтными модулями
  const [modules, setModules] = useState<SidebarModuleUnion[]>(() => {
    const storedModules = localStorage.getItem('sidebar_modules');
    if (storedModules) {
      try {
        // Восстанавливаем модули из localStorage, если они есть
        const parsedModules = JSON.parse(storedModules) as SidebarModuleUnion[];
        
        // Но возвращаем только структуру модулей без компонентов (их нельзя сериализовать)
        return parsedModules.map(module => ({
          ...module,
          component: getComponentForModule(module.type, module.id)
        }));
      } catch (error) {
        console.error('Ошибка при загрузке модулей сайдбара:', error);
        return getDefaultModules();
      }
    }
    return getDefaultModules();
  });

  // Сохраняем модули в localStorage при их изменении
  useEffect(() => {
    try {
      // Сохраняем модули без компонентов, так как React компоненты нельзя сериализовать
      const modulesForStorage = modules.map(module => ({
        ...module,
        component: null
      }));
      localStorage.setItem('sidebar_modules', JSON.stringify(modulesForStorage));
    } catch (error) {
      console.error('Ошибка при сохранении модулей сайдбара:', error);
    }
  }, [modules]);

  // Хелпер для получения компонента модуля по его типу
  const getComponentForModule = (type: SidebarModuleType, id: string): ReactNode => {
    switch (type) {
      case SidebarModuleType.PLAYER:
        return <ContentMiniPlayer key={id} />;
      case SidebarModuleType.POST_CREATOR:
        return (
          <div className="sidebar-placeholder">
            <p>Инструменты для создания поста появятся здесь</p>
          </div>
        );
      case SidebarModuleType.GROUP_MANAGER:
        return (
          <div className="sidebar-placeholder">
            <p>Инструменты для управления группами появятся здесь</p>
          </div>
        );
      case SidebarModuleType.QUEUE_MANAGER:
        return <QueueManager key={id} />;
      case SidebarModuleType.CUSTOM:
        return (
          <div className="sidebar-placeholder">
            <p>Пользовательский модуль</p>
          </div>
        );
      default:
        return null;
    }
  };

  // Начальные дефолтные модули
  function getDefaultModules(): SidebarModuleUnion[] {
    return [
      {
        id: 'player-module',
        type: SidebarModuleType.PLAYER,
        title: 'Плеер',
        component: <ContentMiniPlayer key="player-module" />,
        isVisible: true,
        order: 1
      },
      {
        id: 'queue-manager-module',
        type: SidebarModuleType.QUEUE_MANAGER,
        title: 'Очередь воспроизведения',
        component: <QueueManager key="queue-manager-module" />,
        isVisible: true,
        order: 2,
        canOverflow: true
      },
      {
        id: 'post-creator-module',
        type: SidebarModuleType.POST_CREATOR,
        title: 'Создание поста',
        component: (
          <div className="sidebar-placeholder">
            <p>Инструменты для создания поста появятся здесь</p>
          </div>
        ),
        isVisible: true,
        order: 3
      },
      {
        id: 'group-manager-module',
        type: SidebarModuleType.GROUP_MANAGER,
        title: 'Управление группами',
        component: (
          <div className="sidebar-placeholder">
            <p>Инструменты для управления группами появятся здесь</p>
          </div>
        ),
        isVisible: true,
        order: 4
      }
    ];
  }

  // Добавление нового модуля
  const addModule = (module: SidebarModuleUnion) => {
    setModules(prevModules => [
      ...prevModules,
      {
        ...module,
        order: module.order || prevModules.length + 1
      }
    ]);
  };

  // Удаление модуля по id
  const removeModule = (id: string) => {
    setModules(prevModules => prevModules.filter(module => module.id !== id));
  };

  // Обновление существующего модуля
  const updateModule = (id: string, moduleData: Partial<Omit<SidebarModule, 'type'>>) => {
    setModules(prevModules => 
      prevModules.map(module => {
        if (module.id !== id) return module;
        
        // Обеспечиваем сохранение правильного типа модуля
        const updatedModule = { 
          ...module,
          ...moduleData
        };
        
        // Возвращаем модуль с правильным типом
        return updatedModule as SidebarModuleUnion;
      })
    );
  };

  // Переключение видимости модуля
  const toggleModuleVisibility = (id: string) => {
    setModules(prevModules => 
      prevModules.map(module => 
        module.id === id ? { ...module, isVisible: !module.isVisible } : module
      )
    );
  };

  // Переупорядочивание модулей
  const reorderModules = (startIndex: number, endIndex: number) => {
    setModules(prevModules => {
      const result = Array.from(prevModules);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Обновляем поле order для всех модулей
      return result.map((module, index) => ({
        ...module,
        order: index + 1
      }));
    });
  };

  // Получение только видимых модулей, отсортированных по порядку
  const getVisibleModules = () => {
    return modules
      .filter(module => module.isVisible)
      .sort((a, b) => {
        // Если оба модуля или ни один не страничные - сортируем по порядку
        if ((a.isPageSpecific && b.isPageSpecific) || (!a.isPageSpecific && !b.isPageSpecific)) {
          return a.order - b.order;
        }
        // Если только a страничный - он идет первым
        if (a.isPageSpecific) return -1;
        // Если только b страничный - он идет первым
        return 1;
      });
  };

  // Проверяем наличие модуля информации о группе
  const hasGroupInfoModule = () => {
    return modules.some(module => module.type === SidebarModuleType.GROUP_INFO);
  };

  // Добавляем модуль информации о группе
  const addGroupInfoModule = (groupId: number) => {
    // Если модуль информации о группе уже есть, удаляем его
    const existingModule = modules.find(module => module.type === SidebarModuleType.GROUP_INFO);
    if (existingModule) {
      removeModule(existingModule.id);
    }

    // Создаем новый модуль
    const moduleId = `group-info-${groupId}`;
    const groupInfoModule: GroupInfoModule = {
      id: moduleId,
      type: SidebarModuleType.GROUP_INFO,
      title: 'Информация о группе',
      component: (
        <div className="sidebar-placeholder">
          <p>Информация о группе будет загружена...</p>
        </div>
      ),
      isVisible: true,
      order: 0, // Наивысший приоритет
      isPageSpecific: true,
      pageId: `group-${groupId}`,
      groupId: groupId
    };

    // Добавляем модуль в начало списка
    setModules(prevModules => {
      // Обновляем порядок всех модулей
      const updatedModules = prevModules.map(module => ({
        ...module,
        order: module.order + 1 // Увеличиваем порядок всех существующих модулей
      }));
      return [groupInfoModule, ...updatedModules];
    });

    return moduleId;
  };

  // Удаляем модуль информации о группе
  const removeGroupInfoModule = () => {
    setModules(prevModules => {
      const filteredModules = prevModules.filter(module => module.type !== SidebarModuleType.GROUP_INFO);
      
      // Пересчитываем порядок модулей
      return filteredModules.map((module, index) => ({
        ...module,
        order: index + 1
      }));
    });
  };

  const value = {
    modules,
    addModule,
    removeModule,
    updateModule,
    toggleModuleVisibility,
    reorderModules,
    getVisibleModules,
    addGroupInfoModule,
    removeGroupInfoModule,
    hasGroupInfoModule
  };

  return (
    <SidebarModulesContext.Provider value={value}>
      {children}
    </SidebarModulesContext.Provider>
  );
};

// Хук для использования контекста модулей сайдбара
export const useSidebarModules = () => {
  const context = useContext(SidebarModulesContext);
  if (context === undefined) {
    throw new Error('useSidebarModules must be used within a SidebarModulesProvider');
  }
  return context;
}; 