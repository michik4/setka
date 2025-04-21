import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGroups1743000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создаем таблицу групп
        await queryRunner.query(`
            CREATE TABLE "groups" (
                "id" SERIAL NOT NULL,
                "name" character varying(100) NOT NULL,
                "slug" character varying(50) NOT NULL,
                "description" text,
                "creatorId" integer NOT NULL,
                "avatarId" integer,
                "coverId" integer,
                "isPrivate" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_groups" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_groups_slug" UNIQUE ("slug")
            )
        `);

        // Добавляем связи для групп
        await queryRunner.query(`
            ALTER TABLE "groups" ADD CONSTRAINT "FK_groups_users_creator" 
            FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "groups" ADD CONSTRAINT "FK_groups_photos_avatar" 
            FOREIGN KEY ("avatarId") REFERENCES "photos"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "groups" ADD CONSTRAINT "FK_groups_photos_cover" 
            FOREIGN KEY ("coverId") REFERENCES "photos"("id") ON DELETE SET NULL
        `);

        // Создаем таблицу участников группы
        await queryRunner.query(`
            CREATE TABLE "group_members" (
                "groupId" integer NOT NULL,
                "userId" integer NOT NULL,
                CONSTRAINT "PK_group_members" PRIMARY KEY ("groupId", "userId")
            )
        `);

        // Создаем таблицу администраторов группы
        await queryRunner.query(`
            CREATE TABLE "group_admins" (
                "groupId" integer NOT NULL,
                "userId" integer NOT NULL,
                CONSTRAINT "PK_group_admins" PRIMARY KEY ("groupId", "userId")
            )
        `);

        // Добавляем связи для участников и администраторов
        await queryRunner.query(`
            ALTER TABLE "group_members" ADD CONSTRAINT "FK_group_members_group" 
            FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "group_members" ADD CONSTRAINT "FK_group_members_user" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "group_admins" ADD CONSTRAINT "FK_group_admins_group" 
            FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "group_admins" ADD CONSTRAINT "FK_group_admins_user" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);

        // Добавляем поле groupId в таблицу posts
        await queryRunner.query(`
            ALTER TABLE "posts" ADD COLUMN "groupId" integer
        `);

        await queryRunner.query(`
            ALTER TABLE "posts" ADD CONSTRAINT "FK_posts_groups" 
            FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаляем связь с постами
        await queryRunner.query(`
            ALTER TABLE "posts" DROP CONSTRAINT "FK_posts_groups"
        `);

        await queryRunner.query(`
            ALTER TABLE "posts" DROP COLUMN "groupId"
        `);

        // Удаляем таблицы администраторов и участников
        await queryRunner.query(`
            ALTER TABLE "group_admins" DROP CONSTRAINT "FK_group_admins_user"
        `);

        await queryRunner.query(`
            ALTER TABLE "group_admins" DROP CONSTRAINT "FK_group_admins_group"
        `);

        await queryRunner.query(`
            ALTER TABLE "group_members" DROP CONSTRAINT "FK_group_members_user"
        `);

        await queryRunner.query(`
            ALTER TABLE "group_members" DROP CONSTRAINT "FK_group_members_group"
        `);

        await queryRunner.query(`DROP TABLE "group_admins"`);
        await queryRunner.query(`DROP TABLE "group_members"`);

        // Удаляем связи групп
        await queryRunner.query(`
            ALTER TABLE "groups" DROP CONSTRAINT "FK_groups_photos_cover"
        `);

        await queryRunner.query(`
            ALTER TABLE "groups" DROP CONSTRAINT "FK_groups_photos_avatar"
        `);

        await queryRunner.query(`
            ALTER TABLE "groups" DROP CONSTRAINT "FK_groups_users_creator"
        `);

        // Удаляем таблицу групп
        await queryRunner.query(`DROP TABLE "groups"`);
    }
} 