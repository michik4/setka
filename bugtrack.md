# Bugtrack 

## 0.5.0
### Страницы
- #### Страница музыки (fixed)
  - нет вариации отображения страницы музыки другого пользователя и при переходе на `/users/:user_id/music` отображается музыка зарегистрированного пользователя
- #### Страница фотографий (fixed)
  - скрытые альбомы видны другим пользователям 
  - в "все фотографии" нельзя перелистывать фотографии в расширенном просмотре
- #### Страница сообщества (fixed)
  - У пользователя без прав в сообществе появляется форма создания поста от лица пользователя (на стену пользователя, а не сообщества)
- #### Страница музыкального альбома (fixed)
  - отображается только 3 трека 
  - используются не `universalTrackItem` 

### Компоненты
- `Showcase` (fixed)
  - музыка другого пользователя не отображается 
- Посты (fixed)
  - Можно прикрепить пустой альбом фотографий и таким образом пост будет пустым
- Форма создания поста (fixed)
  - поле ввода текста нельзя скроллить 
- альбомы в постах (fixed)
  - заголовок с названием не кликабельный
- `universalMusicAlbumItem`
  - некорректное отображение добавлен альбом в библиотеку или нет
- `photoGrid` 
  - Высота общей сетки расчитывается без учета, что ограничение 8 фотографий 
- `CreatePostForm.tsx` (fixed)
  - кнопки удаления расположены в невидимой зоне под фотографиями 

### Процессы
- При загрузке альбомов треки из альбома добавляются по отдельности в библиотеку пользователя 