import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TestFeaturesContextType {
  testMode: boolean;
  enableTestMode: () => void;
  disableTestMode: () => void;
  toggleTestMode: () => void;
  isPlayerWindowEnabled: boolean;
  togglePlayerWindowFeature: () => void;
  isMessengerEnabled: boolean;
  toggleMessengerFeature: () => void;
}

const defaultContext: TestFeaturesContextType = {
  testMode: false,
  enableTestMode: () => {},
  disableTestMode: () => {},
  toggleTestMode: () => {},
  isPlayerWindowEnabled: false,
  togglePlayerWindowFeature: () => {},
  isMessengerEnabled: false,
  toggleMessengerFeature: () => {},
};

const TEST_MODE_KEY = 'setka_test_mode';
const PLAYER_WINDOW_FEATURE_KEY = 'setka_player_window_enabled';
const MESSENGER_FEATURE_KEY = 'setka_messenger_enabled';

export const TestFeaturesContext = createContext<TestFeaturesContextType>(defaultContext);

interface TestFeaturesProviderProps {
  children: ReactNode;
}

export const TestFeaturesProvider: React.FC<TestFeaturesProviderProps> = ({ children }) => {
  const [testMode, setTestMode] = useState<boolean>(false);
  const [isPlayerWindowEnabled, setIsPlayerWindowEnabled] = useState<boolean>(false);
  const [isMessengerEnabled, setIsMessengerEnabled] = useState<boolean>(false);

  // Загружаем значение из localStorage при инициализации
  useEffect(() => {
    const savedTestMode = localStorage.getItem(TEST_MODE_KEY);
    if (savedTestMode) {
      setTestMode(savedTestMode === 'true');
    }

    const savedPlayerWindowEnabled = localStorage.getItem(PLAYER_WINDOW_FEATURE_KEY);
    if (savedPlayerWindowEnabled) {
      setIsPlayerWindowEnabled(savedPlayerWindowEnabled === 'true');
    } else {
      // По умолчанию функция плеера в отдельном окне отключена
      localStorage.setItem(PLAYER_WINDOW_FEATURE_KEY, 'false');
      setIsPlayerWindowEnabled(false);
    }
    
    const savedMessengerEnabled = localStorage.getItem(MESSENGER_FEATURE_KEY);
    if (savedMessengerEnabled) {
      setIsMessengerEnabled(savedMessengerEnabled === 'true');
    } else {
      // По умолчанию функция мессенджера отключена
      localStorage.setItem(MESSENGER_FEATURE_KEY, 'false');
      setIsMessengerEnabled(false);
    }
  }, []);

  const enableTestMode = () => {
    setTestMode(true);
    localStorage.setItem(TEST_MODE_KEY, 'true');
  };

  const disableTestMode = () => {
    setTestMode(false);
    localStorage.setItem(TEST_MODE_KEY, 'false');
  };

  const toggleTestMode = () => {
    const newValue = !testMode;
    setTestMode(newValue);
    localStorage.setItem(TEST_MODE_KEY, newValue.toString());
  };

  const togglePlayerWindowFeature = () => {
    const newValue = !isPlayerWindowEnabled;
    setIsPlayerWindowEnabled(newValue);
    localStorage.setItem(PLAYER_WINDOW_FEATURE_KEY, newValue.toString());
  };
  
  const toggleMessengerFeature = () => {
    const newValue = !isMessengerEnabled;
    setIsMessengerEnabled(newValue);
    localStorage.setItem(MESSENGER_FEATURE_KEY, newValue.toString());
  };

  return (
    <TestFeaturesContext.Provider
      value={{
        testMode,
        enableTestMode,
        disableTestMode,
        toggleTestMode,
        isPlayerWindowEnabled,
        togglePlayerWindowFeature,
        isMessengerEnabled,
        toggleMessengerFeature,
      }}
    >
      {children}
    </TestFeaturesContext.Provider>
  );
};

export const useTestFeatures = () => useContext(TestFeaturesContext); 