import { AppDataSource } from './db_connect';
import { AddGroupIdToMusicAlbum1685023456789 } from '../migrations/1685023456789-AddGroupIdToMusicAlbum';
import { RemoveTracksCountFromMusicAlbum1685023456790 } from '../migrations/1685023456790-RemoveTracksCountFromMusicAlbum';

async function runMigrations() {
    try {
        // Инициализация подключения к базе данных
        await AppDataSource.initialize();
        console.log('Подключение к базе данных установлено успешно.');
        
        // Запуск миграций
        console.log('Запуск миграции: AddGroupIdToMusicAlbum...');
        const migration1 = new AddGroupIdToMusicAlbum1685023456789();
        await migration1.up(AppDataSource.manager.connection.createQueryRunner());
        console.log('Миграция AddGroupIdToMusicAlbum выполнена успешно.');
        
        console.log('Запуск миграции: RemoveTracksCountFromMusicAlbum...');
        const migration2 = new RemoveTracksCountFromMusicAlbum1685023456790();
        await migration2.up(AppDataSource.manager.connection.createQueryRunner());
        console.log('Миграция RemoveTracksCountFromMusicAlbum выполнена успешно.');
        
        console.log('Все миграции выполнены успешно.');
    } catch (error) {
        console.error('Ошибка при выполнении миграций:', error);
    } finally {
        // Закрываем соединение с базой данных
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('Соединение с базой данных закрыто.');
        }
    }
}

runMigrations(); 