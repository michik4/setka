import React from 'react';
import { useTestFeatures } from '../../contexts/TestFeaturesContext';
import styles from './TestModeToggle.module.css';

export const TestModeToggle: React.FC = () => {
  const { testMode, toggleTestMode, isPlayerWindowEnabled, togglePlayerWindowFeature } = useTestFeatures();

  return (
    <div className={styles.testModeContainer}>
      <div className={styles.toggleWrapper}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={testMode}
            onChange={toggleTestMode}
            className={styles.toggleInput}
          />
          <span className={styles.slider}></span>
          <span className={styles.toggleText}>Тестовый режим</span>
        </label>
      </div>
      
      {testMode && (
        <div className={styles.testFeatures}>
          <div className={styles.featureToggle}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={isPlayerWindowEnabled}
                onChange={togglePlayerWindowFeature}
                className={styles.toggleInput}
              />
              <span className={styles.slider}></span>
              <span className={styles.toggleText}>Плеер в отдельном окне</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}; 