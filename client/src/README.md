# Документация по аудио сервисам

## AudioChannelService

AudioChannelService - это сервис для управления каналами воспроизведения аудио, который предотвращает дублирование и конфликты при воспроизведении аудио в различных частях приложения.

### Основные функции

- `registerAudio(channelId, audio, isMaster)` - регистрирует аудио элемент в сервисе
- `playTrack(channelId, track, position, forcePlay)` - воспроизводит трек в указанном канале
- `stopAllExcept(exceptChannelId)` - останавливает воспроизведение во всех каналах кроме указанного
- `pauseActiveChannel()` - ставит на паузу активный канал
- `unregisterAudio(channelId)` - удаляет регистрацию аудио элемента
- `setMasterChannel(channelId)` - устанавливает приоритетный канал

### Отладка проблем с аудио каналами

Если вы столкнулись с ошибками вроде "Канал X не найден для воспроизведения", следуйте этим шагам:

1. **Используйте согласованный ID канала**
   - В приложении должен использоваться один и тот же ID канала для всех компонентов, работающих с одним аудио элементом
   - Берите `channelId` из PlayerContext вместо создания собственного:
   ```typescript
   const { audio, channelId } = usePlayer();
   
   useEffect(() => {
     if (!audioChannelService.isChannelRegistered(channelId)) {
       audioChannelService.registerAudio(channelId, audio);
     }
   }, [channelId, audio]);
   ```

2. **Проверяйте регистрацию канала перед использованием**
   - Перед воспроизведением всегда проверяйте существование канала:
   ```typescript
   const playTrack = (track) => {
     if (!audioChannelService.isChannelRegistered(channelId)) {
       console.log(`Регистрация аудио канала ${channelId}`);
       audioChannelService.registerAudio(channelId, audio);
     }
     audioChannelService.playTrack(channelId, track);
   };
   ```

3. **Проверьте консоль на наличие сообщений от AudioChannelService**
   - Сервис регистрирует все важные события и ошибки в консоли с префиксом `[AudioChannelService]`
   - При получении ошибки "Канал не найден", посмотрите список зарегистрированных каналов в логе

4. **Общие причины проблем и их решения**:
   - **Несогласованные ID каналов**: используйте константу PLAYER_CHANNEL_PREFIX и один channelId
   - **Преждевременное удаление канала**: не удаляйте канал в компонентах, если он используется в других местах
   - **Множественные регистрации**: проверяйте существование канала с помощью isChannelRegistered

5. **Диагностика при сложных проблемах**
   - Выведите список всех зарегистрированных каналов:
   ```typescript
   console.log('Зарегистрированные каналы:', audioChannelService.getRegisteredChannelIds());
   ```
   - Проверьте согласованность ID между компонентами:
   ```typescript
   console.log('ID в PlayerContext:', playerChannelId);
   console.log('ID в MiniPlayer:', miniPlayerChannelId);
   ```

### Использование в компонентах

```typescript
import audioChannelService from '../services/AudioChannelService';

// В компоненте с аудио плеером
useEffect(() => {
  const channelId = `player_${instanceId}`;
  audioChannelService.registerAudio(channelId, audioElement);
  
  return () => {
    audioChannelService.unregisterAudio(channelId);
  };
}, [audioElement, instanceId]);

// Воспроизведение трека
const handlePlay = () => {
  if (currentTrack) {
    audioChannelService.playTrack(channelId, currentTrack);
  }
};

// Пауза
const handlePause = () => {
  audioChannelService.pauseActiveChannel();
};
```

## AudioValidationService

AudioValidationService - сервис для валидации аудио потоков и диагностики ошибок, связанных с воспроизведением.

### Основные функции

- `validateAudioUrl(audioUrl, trackId)` - проверяет валидность URL аудио
- `preloadAudio(audioUrl, trackId)` - предварительная загрузка аудио для проверки
- `logError(errorType, errorMessage)` - регистрирует ошибку воспроизведения
- `diagnoseAudioIssues()` - анализирует и возвращает список обнаруженных проблем
- `getErrorStats()` - возвращает статистику по ошибкам
- `resetErrorStats()` - сбрасывает статистику ошибок

### Использование в приложении

```typescript
import audioValidationService from '../services/AudioValidationService';

// Перед воспроизведением трека
const playTrack = async (track) => {
  if (!track.audioUrl) {
    audioValidationService.logError('missing_url', `Трек ${track.id} без URL`);
    return;
  }
  
  const isValid = await audioValidationService.validateAudioUrl(track.audioUrl, track.id);
  if (isValid) {
    // Воспроизводим трек
    // ...
  } else {
    console.error('Невалидный URL аудио');
  }
};

// Диагностика проблем
const diagnoseIssues = () => {
  const issues = audioValidationService.diagnoseAudioIssues();
  issues.forEach(issue => console.warn(issue));
};
```

## Решение проблем с дублированием аудио

### Основные ошибки и их решение

1. **Конфликт воспроизведения в разных компонентах**

   Проблема: Несколько компонентов пытаются воспроизводить аудио одновременно.
   
   Решение: Используйте `registerAudio` для всех аудио элементов и `playTrack` из AudioChannelService вместо прямого вызова `audio.play()`.

2. **Неостановленное воспроизведение при переключении треков**

   Проблема: При переключении треков старое аудио не останавливается.
   
   Решение: Используйте `stopAllExcept` перед началом воспроизведения нового трека.

3. **Невалидные аудио URL**

   Проблема: Попытка воспроизведения треков с невалидными URL.
   
   Решение: Проверяйте URL с помощью `validateAudioUrl` перед воспроизведением.

### Рекомендации по интеграции

1. Каждый компонент, использующий аудио, должен регистрировать свой аудио элемент в AudioChannelService.
2. Используйте уникальные ID каналов, например `${componentName}_${instanceId}`.
3. Проверяйте валидность треков перед воспроизведением.
4. Используйте логирование ошибок для отслеживания проблем.
5. Периодически запускайте диагностику с помощью `diagnoseAudioIssues()` для выявления системных проблем.

## Пример полной интеграции

```typescript
import React, { useEffect, useState } from 'react';
import audioChannelService from '../services/AudioChannelService';
import audioValidationService from '../services/AudioValidationService';

const MyAudioPlayer = ({ track, instanceId }) => {
  const [audio] = useState(new Audio());
  const channelId = `myPlayer_${instanceId}`;
  
  useEffect(() => {
    // Регистрация в сервисе
    audioChannelService.registerAudio(channelId, audio);
    
    return () => {
      audioChannelService.unregisterAudio(channelId);
    };
  }, [audio, channelId]);
  
  const handlePlay = async () => {
    if (!track) return;
    
    const audioUrl = track.audioUrl || (track.filename ? `/api/music/file/${track.filename}` : null);
    
    if (!audioUrl) {
      audioValidationService.logError('missing_url', `Трек ${track.id} без URL`);
      return;
    }
    
    const isValid = await audioValidationService.validateAudioUrl(audioUrl, track.id);
    if (isValid) {
      audioChannelService.playTrack(channelId, track);
    } else {
      console.error('Невалидный URL аудио');
    }
  };
  
  // Остальной код компонента
  
  return (
    <div>
      <button onClick={handlePlay}>Play</button>
      <button onClick={() => audioChannelService.pauseActiveChannel()}>Pause</button>
    </div>
  );
}; 