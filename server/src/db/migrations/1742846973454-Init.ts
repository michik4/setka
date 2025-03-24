import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1742846973454 implements MigrationInterface {
    name = 'Init1742846973454'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "photos" ("id" SERIAL NOT NULL, "filename" character varying NOT NULL, "originalName" character varying NOT NULL, "mimetype" character varying NOT NULL, "size" integer NOT NULL, "path" character varying NOT NULL, "userId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "description" character varying, CONSTRAINT "PK_5220c45b8e32d49d767b9b3d725" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "posts" ("id" SERIAL NOT NULL, "content" text NOT NULL, "authorId" integer NOT NULL, "likesCount" integer NOT NULL DEFAULT '0', "commentsCount" integer NOT NULL DEFAULT '0', "sharesCount" integer NOT NULL DEFAULT '0', "viewsCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "nickname" character varying(50), "email" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ad02a1be8707004cb805a4b5023" UNIQUE ("nickname"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."chats_type_enum" AS ENUM('private', 'group')`);
        await queryRunner.query(`CREATE TABLE "chats" ("id" SERIAL NOT NULL, "type" "public"."chats_type_enum" NOT NULL DEFAULT 'private', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0117647b3c4a4e5ff198aeb6206" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" SERIAL NOT NULL, "content" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "senderId" integer, "chatId" integer, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sessions" ("sessionId" character varying NOT NULL, "userId" integer NOT NULL, "deviceInfo" character varying, "ipAddress" character varying NOT NULL, "lastActivity" TIMESTAMP NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ba57f8421edf5e5c4e99b833811" PRIMARY KEY ("sessionId"))`);
        await queryRunner.query(`CREATE TABLE "posts_photos" ("postId" integer NOT NULL, "photoId" integer NOT NULL, CONSTRAINT "PK_ada1727feb5265436957b5efb77" PRIMARY KEY ("postId", "photoId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_934fb1ddd084238e16d22bcb95" ON "posts_photos" ("postId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ff1e192926f259226eecc464e3" ON "posts_photos" ("photoId") `);
        await queryRunner.query(`CREATE TABLE "users_chats" ("chat_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_fcb50519f862287eb48b8c30e4b" PRIMARY KEY ("chat_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_96069fbdbdb77b59fbf424087c" ON "users_chats" ("chat_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e0660504bfbae9466accc7c91f" ON "users_chats" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "photos" ADD CONSTRAINT "FK_74da4f305b050f7d27c73b04263" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "FK_c5a322ad12a7bf95460c958e80e" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_36bc604c820bb9adc4c75cd4115" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "posts_photos" ADD CONSTRAINT "FK_934fb1ddd084238e16d22bcb95e" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "posts_photos" ADD CONSTRAINT "FK_ff1e192926f259226eecc464e32" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_chats" ADD CONSTRAINT "FK_96069fbdbdb77b59fbf424087c4" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_chats" ADD CONSTRAINT "FK_e0660504bfbae9466accc7c91f8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_chats" DROP CONSTRAINT "FK_e0660504bfbae9466accc7c91f8"`);
        await queryRunner.query(`ALTER TABLE "users_chats" DROP CONSTRAINT "FK_96069fbdbdb77b59fbf424087c4"`);
        await queryRunner.query(`ALTER TABLE "posts_photos" DROP CONSTRAINT "FK_ff1e192926f259226eecc464e32"`);
        await queryRunner.query(`ALTER TABLE "posts_photos" DROP CONSTRAINT "FK_934fb1ddd084238e16d22bcb95e"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_36bc604c820bb9adc4c75cd4115"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_c5a322ad12a7bf95460c958e80e"`);
        await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "FK_74da4f305b050f7d27c73b04263"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e0660504bfbae9466accc7c91f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_96069fbdbdb77b59fbf424087c"`);
        await queryRunner.query(`DROP TABLE "users_chats"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ff1e192926f259226eecc464e3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_934fb1ddd084238e16d22bcb95"`);
        await queryRunner.query(`DROP TABLE "posts_photos"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TABLE "chats"`);
        await queryRunner.query(`DROP TYPE "public"."chats_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "posts"`);
        await queryRunner.query(`DROP TABLE "photos"`);
    }

}
