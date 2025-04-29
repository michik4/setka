import React, { useState } from 'react';
import { useTestFeatures } from '../contexts/TestFeaturesContext';
import ModuleManager from '../components/ModuleManager/ModuleManager';
import NotificationExample from '../components/Notifications/NotificationExample';
import styles from './TestModePage.module.css';

export const TestModePage: React.FC = () => {
  const { 
    testMode, 
    toggleTestMode, 
    isPlayerWindowEnabled, 
    togglePlayerWindowFeature,
    isMessengerEnabled,
    toggleMessengerFeature 
  } = useTestFeatures();
  
  const [activeTab, setActiveTab] = useState<'features' | 'modules'>('features');

  return (
    <div className={styles.testModeContainer}>
      <h2 className={styles.title}>Тестовые функции</h2>
      
      <div className={styles.tabsContainer}>
        <div 
          className={`${styles.tab} ${activeTab === 'features' ? styles.active : ''}`}
          onClick={() => setActiveTab('features')}
        >
          Тестовые функции
        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'modules' ? styles.active : ''}`}
          onClick={() => setActiveTab('modules')}
        >
          Модули сайдбара
        </div>
      </div>
      
      {activeTab === 'features' && (
        <div className={styles.featureSection}>
          <div className={styles.featureItem}>
            <div className={styles.featureInfo}>
              <h3 className={styles.featureTitle}>Тестовый режим</h3>
              <p className={styles.featureDescription}>
                Включает режим тестирования и доступ к экспериментальным функциям
              </p>
            </div>
            <div className={styles.toggleWrapper}>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={toggleTestMode}
                  className={styles.toggleInput}
                />
                <span className={styles.slider}></span>
              </label>
              <span className={styles.toggleStatus}>
                {testMode ? 'Включено' : 'Выключено'}
              </span>
            </div>
          </div>
          
          {testMode && (
            <>
              <div className={styles.sectionDivider}></div>
              <h3 className={styles.sectionTitle}>Доступные тестовые функции</h3>
              
              <div className={styles.featureItem}>
                <div className={styles.featureInfo}>
                  <h3 className={styles.featureTitle}>Плеер в отдельном окне</h3>
                  <p className={styles.featureDescription}>
                    Позволяет открыть музыкальный плеер в отдельном окне браузера (появляется кнопка в мини плеере)
                  </p>
                </div>
                <div className={styles.toggleWrapper}>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={isPlayerWindowEnabled}
                      onChange={togglePlayerWindowFeature}
                      className={styles.toggleInput}
                    />
                    <span className={styles.slider}></span>
                  </label>
                  <span className={styles.toggleStatus}>
                    {isPlayerWindowEnabled ? 'Включено' : 'Выключено'}
                  </span>
                </div>
              </div>
              
              <div className={styles.featureItem}>
                <div className={styles.featureInfo}>
                  <h3 className={styles.featureTitle}>Мессенджер</h3>
                  <p className={styles.featureDescription}>
                    Включает функцию обмена сообщениями между пользователями (появится вкладка "Сообщения"). <br /> <span style={{color: 'var(--vseti-color-error)'}}>На данный момент не работает.</span>
                  </p>
                </div>
                <div className={styles.toggleWrapper}>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={isMessengerEnabled}
                      onChange={toggleMessengerFeature}
                      className={styles.toggleInput}
                    />
                    <span className={styles.slider}></span>
                  </label>
                  <span className={styles.toggleStatus}>
                    {isMessengerEnabled ? 'Включено' : 'Выключено'}
                  </span>
                </div>
              </div>
              
              <div className={styles.featureItem}>
                <div className={styles.featureInfo}>
                  <h3 className={styles.featureTitle}>Тест уведомлений</h3>
                  <p className={styles.featureDescription}>
                    Позволяет протестировать разные типы уведомлений
                  </p>
                </div>
                <div>
                  <NotificationExample />
                </div>
              </div>
              
              {/* Здесь можно добавить другие тестовые функции в будущем */}
            </>
          )}
          
          <div className={styles.infoBox}>
            <h4 className={styles.infoTitle}>Информация</h4>
            <p className={styles.infoText}>
              Тестовые функции могут работать нестабильно или содержать ошибки. Используйте их на свой страх и риск.
            </p>
          </div>
        </div>
      )}
      
      {activeTab === 'modules' && (
        <div className={styles.modulesSection}>
          <ModuleManager />
        </div>
      )}
    </div>
  );
}; 