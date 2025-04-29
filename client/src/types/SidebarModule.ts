import { ReactNode } from 'react';

/**
 * Типы модулей, которые могут быть добавлены в правый сайдбар
 */
export enum SidebarModuleType {
  PLAYER = 'player',
  POST_CREATOR = 'post_creator',
  GROUP_MANAGER = 'group_manager',
  GROUP_INFO = 'group_info',
  PAGE_SPECIFIC = 'page_specific',
  QUEUE_MANAGER = 'queue_manager',
  CUSTOM = 'custom'
}

/**
 * Интерфейс базового модуля сайдбара
 */
export interface SidebarModule {
  id: string;
  type: SidebarModuleType;
  title: string;
  component: ReactNode;
  isVisible: boolean;
  order: number;
  isPageSpecific?: boolean;
  pageId?: string;
  permissions?: string[];
  settings?: Record<string, any>;
  canOverflow?: boolean;
}

/**
 * Интерфейс модуля плеера
 */
export interface PlayerModule extends SidebarModule {
  type: SidebarModuleType.PLAYER;
}

/**
 * Интерфейс модуля создания постов
 */
export interface PostCreatorModule extends SidebarModule {
  type: SidebarModuleType.POST_CREATOR;
}

/**
 * Интерфейс модуля управления группами
 */
export interface GroupManagerModule extends SidebarModule {
  type: SidebarModuleType.GROUP_MANAGER;
}

/**
 * Интерфейс модуля информации о группе
 */
export interface GroupInfoModule extends SidebarModule {
  type: SidebarModuleType.GROUP_INFO;
  isPageSpecific: true;
  pageId: string;
  groupId?: number;
}

/**
 * Интерфейс модуля, привязанного к конкретной странице
 */
export interface PageSpecificModule extends SidebarModule {
  type: SidebarModuleType.PAGE_SPECIFIC;
  isPageSpecific: true;
  pageId: string;
  pageType: string;
}

/**
 * Интерфейс модуля управления очередью
 */
export interface QueueManagerModule extends SidebarModule {
  type: SidebarModuleType.QUEUE_MANAGER;
}

/**
 * Интерфейс произвольного пользовательского модуля
 */
export interface CustomModule extends SidebarModule {
  type: SidebarModuleType.CUSTOM;
  component: ReactNode;
  settings: {
    description: string;
  };
}

/**
 * Тип, объединяющий все возможные модули
 */
export type SidebarModuleUnion = 
  | PlayerModule 
  | PostCreatorModule 
  | GroupManagerModule 
  | GroupInfoModule
  | PageSpecificModule
  | QueueManagerModule
  | CustomModule; 