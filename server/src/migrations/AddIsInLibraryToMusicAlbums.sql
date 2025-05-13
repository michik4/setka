-- Добавление столбца isInLibrary в таблицу music_albums
ALTER TABLE "music_albums" ADD COLUMN "isInLibrary" boolean NOT NULL DEFAULT true;

-- Обновление существующих записей (если необходимо)
UPDATE "music_albums" SET "isInLibrary" = true WHERE "isInLibrary" IS NULL; 