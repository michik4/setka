import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
  isMobile: boolean;
}

/**
 * Хук для отслеживания размеров окна браузера
 * @returns объект с шириной, высотой и флагом мобильного устройства
 */
const useWindowSize = (): WindowSize => {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
  });

  useEffect(() => {
    // Обработчик изменения размера окна
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
      });
    };

    // Добавляем слушатель события
    window.addEventListener('resize', handleResize);
    
    // Удаляем слушатель при размонтировании компонента
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

export default useWindowSize; 