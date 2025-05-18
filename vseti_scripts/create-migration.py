import psycopg2
import os
import time

def print_table(table):
    print("\n")
    print("-" * 100)
    print("Table: ", table[0])
    print("-" * 100)
    print(table[0])

def print_table_structure(connection, table_name):
    cursor = connection.cursor()
    cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}'")
    columns = cursor.fetchall()

    print("\n")
    print("-" * 100)
    print("Table: ", table_name)
    print("-" * 100)
    for column in columns:
        print(f"{column[0]:<20} {column[1]:<20}")
    print("\n")

def create_migration(connection):
    cursor = connection.cursor()

    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    tables = cursor.fetchall()

    cwd = os.path.dirname(os.path.abspath(__file__))

    if not os.path.exists(f"{cwd}/migrations"):
        os.makedirs(f"{cwd}/migrations")

    migration_file = f"{cwd}/migrations/migration_{time.strftime('%Y%m%d_%H%M%S')}.sql"

    for table in tables:
        print_table_structure(connection, table[0])

    with open(migration_file, "w") as f:
        # Добавим комментарий в начале файла миграции
        f.write("-- automatically generated migration\n")
        f.write(f"-- creation date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        for table in tables:
            table_name = table[0]
            
            # Проверка существования и создание таблицы
            f.write(f"-- check and create table {table_name}\n")
            f.write(f"DO $$\n")
            f.write(f"BEGIN\n")
            f.write(f"    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '{table_name}') THEN\n")
            f.write(f"        CREATE TABLE {table_name};\n")
            f.write(f"    END IF;\n")
            f.write(f"END $$;\n\n")
            
            # Получаем список столбцов и их типов
            cursor.execute(f"SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name = '{table_name}'")
            columns = cursor.fetchall()
            
            # Добавление столбцов, если они не существуют
            for column in columns:
                column_name = column[0]
                data_type = column[1]
                
                # Обработка типов с дополнительными параметрами
                if data_type == 'character varying' and column[2]:
                    data_type = f"character varying({column[2]})"
                elif data_type == 'numeric' and column[3] and column[4]:
                    data_type = f"numeric({column[3]},{column[4]})"
                
                f.write(f"-- add column {column_name} to table {table_name}\n")
                f.write(f"DO $$\n")
                f.write(f"BEGIN\n")
                f.write(f"    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = '{column_name}') THEN\n")
                f.write(f"        ALTER TABLE {table_name} ADD COLUMN {column_name} {data_type};\n")
                f.write(f"    END IF;\n")
                f.write(f"END $$;\n\n")
        
        print(f"migration file created: {migration_file}")

def main():
    dbname = input("dbname (default: vseti): ") or "vseti"
    user = input("user (default: postgres): ") or "postgres"
    password = input("password (required): ") or "!CvBn3228"
    host = input("host (default: localhost): ") or "localhost"
    port = input("port (default: 5432): ") or "5432"

    conn = psycopg2.connect(dbname=dbname, user=user, password=password, host=host, port=port)
    cursor = conn.cursor()

    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    tables = cursor.fetchall()

    for table in tables:
        print_table_structure(conn, table[0])

    create_migration(conn)

    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()