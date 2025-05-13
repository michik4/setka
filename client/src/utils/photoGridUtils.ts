import { Photo } from '../types/photo.types';

interface GridItem {
  photo: Photo;
  width: number;
  height: number;
  ratio: number;
  top: number;
  left: number;
  row: number;
}

interface Row {
  items: GridItem[];
  height: number;
  width: number;
}

// Стандартные соотношения сторон фотографий
const standardRatios = [9/16, 3/4, 1/1, 4/3, 16/9];
const defaultRatio = 4/3; // стандартное соотношение, если не удалось определить

/**
 * Извлекает метаданные о размерах изображения из пути или других свойств фото
 * Формат может быть как URL с параметрами, так и серверное имя файла с закодированными размерами
 */
const extractMetadataFromUrl = (path: string): { width: number; height: number } | null => {
  // Проверяем, содержит ли URL информацию о размерах
  // Например, "photo_123_800x600.jpg" или "photo?w=800&h=600"
  
  // Вариант 1: проверка формата width x height в имени файла
  const dimensions1 = path.match(/(\d+)x(\d+)/i);
  if (dimensions1 && dimensions1.length === 3) {
    const width = parseInt(dimensions1[1], 10);
    const height = parseInt(dimensions1[2], 10);
    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }
  
  // Вариант 2: проверка параметров w и h в URL
  const urlParams = new URLSearchParams(path.split('?')[1] || '');
  const widthParam = urlParams.get('w') || urlParams.get('width');
  const heightParam = urlParams.get('h') || urlParams.get('height');
  
  if (widthParam && heightParam) {
    const width = parseInt(widthParam, 10);
    const height = parseInt(heightParam, 10);
    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }
  
  return null;
};

/**
 * Попытка получить соотношение сторон из метадaнных фотографии, если они доступны
 */
const getRatioFromMetadata = (photo: Photo): number | null => {
  // 1. Проверяем, есть ли у объекта Photo поля width и height
  if (
    'width' in photo && 
    'height' in photo && 
    typeof photo.width === 'number' && 
    typeof photo.height === 'number' && 
    photo.width > 0 && 
    photo.height > 0
  ) {
    return photo.width / photo.height;
  }
  
  // 2. Проверяем, есть ли размеры в метаданных или описании
  if (photo.description) {
    const dimensions = photo.description.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (dimensions && dimensions.length === 3) {
      const width = parseInt(dimensions[1], 10);
      const height = parseInt(dimensions[2], 10);
      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        return width / height;
      }
    }
  }
  
  // 3. Пытаемся извлечь размеры из пути к файлу
  if (photo.path) {
    const metadata = extractMetadataFromUrl(photo.path);
    if (metadata) {
      return metadata.width / metadata.height;
    }
  }
  
  // 4. Проверяем, есть ли в имени файла или оригинальном имени информация о размерах
  if (photo.originalName) {
    const dimensions = photo.originalName.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (dimensions && dimensions.length === 3) {
      const width = parseInt(dimensions[1], 10);
      const height = parseInt(dimensions[2], 10);
      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        return width / height;
      }
    }
  }
  
  return null;
};

/**
 * Определяет соотношение сторон фотографии из метаданных или выбирает стандартное
 */
export const getPhotoRatio = (photo: Photo): number => {
  // Пытаемся получить соотношение из метаданных
  const ratioFromMetadata = getRatioFromMetadata(photo);
  if (ratioFromMetadata) {
    return ratioFromMetadata;
  }
  
  // Извлекаем размеры из имени файла
  const dimensions = photo.path ? photo.path.match(/(\d+)x(\d+)/i) : null;
  if (dimensions && dimensions.length === 3) {
    const width = parseInt(dimensions[1], 10);
    const height = parseInt(dimensions[2], 10);
    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
      return width / height;
    }
  }
  
  // Если не удалось определить из метаданных или имени файла, 
  // выбираем стандартное соотношение
  return defaultRatio;
};

/**
 * Создает сетку фотографий на основе алгоритма "кирпичной кладки"
 */
export const createPhotoGrid = (
  photos: Photo[], 
  containerWidth: number,
  targetRatio: number = 4/3, // целевое соотношение сторон всей сетки
  minHeight: number = 80 // минимальная высота каждой фотографии
): GridItem[] => {
  if (!photos.length) return [];
  
  // Используем универсальный алгоритм "кирпичной кладки" для любого количества фотографий
  const bestLayout = findBestLayout(photos, containerWidth, targetRatio, minHeight);
  return bestLayout;
};

/**
 * Находит оптимальную высоту для компоновки сетки
 */
const findBestLayout = (
  photos: Photo[], 
  containerWidth: number, 
  targetRatio: number, 
  minHeight: number
): GridItem[] => {
  // Если всего одна фотография, обрабатываем её отдельно
  if (photos.length === 1) {
    const ratio = getPhotoRatio(photos[0]);
    const height = containerWidth / ratio;
    
    return [{
      photo: photos[0],
      width: containerWidth,
      height,
      ratio,
      top: 0,
      left: 0,
      row: 0
    }];
  }
  
  // Для двух фотографий обрабатываем особым образом, чтобы учесть их ориентацию
  if (photos.length === 2) {
    const ratio1 = getPhotoRatio(photos[0]);
    const ratio2 = getPhotoRatio(photos[1]);
    
    const items: GridItem[] = [];
    
    // Проверяем ориентацию фотографий
    const isHorizontal1 = ratio1 > 1;
    const isHorizontal2 = ratio2 > 1;
    
    // Распределяем пространство в зависимости от ориентации
    let leftWidth, rightWidth;
    
    if (isHorizontal1 && !isHorizontal2) {
      // Первая горизонтальная, вторая вертикальная
      leftWidth = containerWidth * 0.67;
      rightWidth = containerWidth * 0.33 - 2;
    } else if (!isHorizontal1 && isHorizontal2) {
      // Первая вертикальная, вторая горизонтальная
      leftWidth = containerWidth * 0.33 - 2;
      rightWidth = containerWidth * 0.67;
    } else {
      // Обе одинаковой ориентации - распределяем пропорционально соотношениям
      const totalRatio = ratio1 + ratio2;
      leftWidth = containerWidth * (ratio1 / totalRatio);
      rightWidth = containerWidth * (ratio2 / totalRatio);
    }
    
    // Вычисляем высоту каждой фотографии отдельно, чтобы сохранить соотношение сторон
    const leftHeight = leftWidth / ratio1;
    const rightHeight = rightWidth / ratio2;
    
    // Определяем общую высоту ряда - максимальная из высот фотографий
    const rowHeight = Math.max(leftHeight, rightHeight);
    
    // Пересчитываем ширину с учетом общей высоты ряда, чтобы не искажать соотношение сторон
    const correctedLeftWidth = rowHeight * ratio1;
    const correctedRightWidth = rowHeight * ratio2;
    
    // Делаем небольшой отступ между фотографиями
    const gap = 2;
    
    items.push({
      photo: photos[0],
      width: correctedLeftWidth - gap/2,
      height: rowHeight,
      ratio: ratio1,
      top: 0,
      left: 0,
      row: 0
    });
    
    items.push({
      photo: photos[1],
      width: correctedRightWidth - gap/2,
      height: rowHeight,
      ratio: ratio2,
      top: 0,
      left: correctedLeftWidth + gap/2,
      row: 0
    });
    
    return items;
  }
  
  // Для остальных случаев используем алгоритм "кирпичной кладки"
  // с пробными высотами для поиска оптимального варианта
  const steps = 30;
  const maxHeight = containerWidth / 1.2; // Повышаем максимальную высоту
  const heightStep = (maxHeight - minHeight) / steps;
  
  let bestLayout: GridItem[] = [];
  let bestRatioDiff = Infinity;
  
  // Перебираем различные варианты базовой высоты строки
  for (let h = minHeight; h <= maxHeight; h += heightStep) {
    const layout = calculateLayout(photos, containerWidth, h);
    
    // Вычисляем общую высоту сетки
    const gridHeight = Math.max(...layout.map(item => item.top + item.height));
    const gridRatio = containerWidth / gridHeight;
    
    // Вычисляем отклонение от целевого соотношения
    const ratioDiff = Math.abs(gridRatio - targetRatio);
    
    // Если это лучший вариант, сохраняем его
    if (ratioDiff < bestRatioDiff) {
      bestRatioDiff = ratioDiff;
      bestLayout = layout;
    }
  }
  
  return bestLayout;
};

/**
 * Рассчитывает позиции элементов сетки для заданной высоты строки
 */
const calculateLayout = (photos: Photo[], containerWidth: number, rowHeight: number): GridItem[] => {
  const items: GridItem[] = [];
  const rows: Row[] = [];
  
  let currentRow: Row = { items: [], height: rowHeight, width: 0 };
  let rowIndex = 0;
  const gap = 2; // Отступ между фотографиями
  
  // Формируем ряды фотографий, выравнивая их по высоте
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const ratio = getPhotoRatio(photo);
    
    // Рассчитываем ширину фото при заданной высоте строки
    const photoWidth = rowHeight * ratio;
    
    // Если фото не помещается в текущий ряд, создаем новый
    // Добавляем проверку на минимальную ширину, чтобы избежать слишком узких фотографий
    const minPhotoWidth = rowHeight * 0.5; // Минимальная ширина фото
    
    if ((currentRow.width + photoWidth > containerWidth && currentRow.items.length > 0) || 
        (photoWidth < minPhotoWidth && currentRow.items.length > 0)) {
      // Сохраняем текущий ряд
      rows.push(currentRow);
      
      // Создаем новый ряд
      currentRow = { items: [], height: rowHeight, width: 0 };
      rowIndex++;
    }
    
    // Добавляем фото в текущий ряд
    const gridItem: GridItem = {
      photo,
      width: photoWidth,
      height: rowHeight,
      ratio,
      top: rowIndex * (rowHeight + gap),
      left: currentRow.width,
      row: rowIndex
    };
    
    currentRow.items.push(gridItem);
    currentRow.width += photoWidth + (currentRow.items.length > 1 ? gap : 0);
    items.push(gridItem);
  }
  
  // Добавляем последний ряд
  if (currentRow.items.length > 0) {
    rows.push(currentRow);
  }
  
  // Масштабируем каждый ряд, чтобы заполнить всю ширину контейнера
  let currentTop = 0;
  
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    
    // Если в ряду только одна фотография
    if (row.items.length === 1) {
      const item = row.items[0];
      
      // Рассчитываем размеры с сохранением соотношения сторон
      item.width = containerWidth;
      item.height = containerWidth / item.ratio;
      item.left = 0;
      item.top = currentTop;
      
      // Увеличиваем currentTop для следующего ряда
      currentTop += item.height + gap;
    }
    // Если в ряду несколько фотографий
    else {
      // Учитываем отступы между фотографиями при масштабировании
      const totalGapWidth = gap * (row.items.length - 1);
      const totalPhotoWidth = row.width - totalGapWidth;
      const scale = (containerWidth - totalGapWidth) / totalPhotoWidth;
      
      // Устанавливаем позицию и размеры для каждого элемента в ряду
      let currentLeft = 0;
      
      for (let i = 0; i < row.items.length; i++) {
        const item = row.items[i];
        
        // Масштабируем ширину, сохраняя соотношение сторон
        const originalWidth = item.width;
        item.width = originalWidth * scale;
        item.height = rowHeight * scale;
        
        // Устанавливаем позицию
        item.left = currentLeft;
        item.top = currentTop;
        
        // Сдвигаем позицию для следующей фотографии
        currentLeft += item.width + (i < row.items.length - 1 ? gap : 0);
      }
      
      // Увеличиваем currentTop для следующего ряда
      currentTop += rowHeight * scale + gap;
    }
  }
  
  return items;
};

/**
 * Преобразует обработанные элементы сетки в CSS стили
 */
export const gridItemToStyle = (item: GridItem): React.CSSProperties => {
  return {
    position: 'absolute',
    top: `${item.top}px`,
    left: `${item.left}px`,
    width: `${item.width}px`,
    height: `${item.height}px`,
    overflow: 'hidden'
  };
}; 