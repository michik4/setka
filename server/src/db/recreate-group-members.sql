
DROP TABLE IF EXISTS "group_members" CASCADE;


CREATE TABLE "group_members" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "isAdmin" BOOLEAN DEFAULT false,
    "isCreator" BOOLEAN DEFAULT false, 
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);


ALTER TABLE "group_members" ADD CONSTRAINT "FK_group_members_userId" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "group_members" ADD CONSTRAINT "FK_group_members_groupId" 
    FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE; 