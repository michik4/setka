import { AppDataSource } from './db_connect';

// Функция для проверки структуры таблицы
async function checkTable() {
    try {
        // Инициализируем соединение с базой данных
        await AppDataSource.initialize();
        console.log('База данных успешно подключена');

        // Выполняем запрос для получения информации о таблице
        const query = `
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'group_members'
            ORDER BY ordinal_position;
        `;
        
        const tableInfo = await AppDataSource.query(query);
        console.log('Структура таблицы group_members:');
        console.table(tableInfo);

        // Проверяем существующие ограничения
        const constraintsQuery = `
            SELECT con.conname AS constraint_name, 
                   contype AS constraint_type,
                   pg_get_constraintdef(con.oid) AS constraint_definition
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = 'group_members';
        `;
        
        const constraints = await AppDataSource.query(constraintsQuery);
        console.log('Ограничения таблицы group_members:');
        console.table(constraints);

        // Закрываем соединение
        await AppDataSource.destroy();
    } catch (error) {
        console.error('Ошибка при проверке таблицы:', error);
    }
}

// Запускаем функцию
checkTable(); 