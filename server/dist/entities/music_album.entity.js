"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicAlbum = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const music_entity_1 = require("./music.entity");
const group_entity_1 = require("./group.entity");
let MusicAlbum = class MusicAlbum {
};
exports.MusicAlbum = MusicAlbum;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MusicAlbum.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MusicAlbum.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MusicAlbum.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], MusicAlbum.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", user_entity_1.User)
], MusicAlbum.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], MusicAlbum.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => group_entity_1.Group, { nullable: true }),
    __metadata("design:type", group_entity_1.Group)
], MusicAlbum.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => music_entity_1.MusicTrack),
    (0, typeorm_1.JoinTable)({
        name: "music_album_tracks",
        joinColumn: {
            name: "albumId",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "trackId",
            referencedColumnName: "id"
        }
    }),
    __metadata("design:type", Array)
], MusicAlbum.prototype, "tracks", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MusicAlbum.prototype, "coverUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], MusicAlbum.prototype, "isPrivate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MusicAlbum.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], MusicAlbum.prototype, "updatedAt", void 0);
exports.MusicAlbum = MusicAlbum = __decorate([
    (0, typeorm_1.Entity)("music_albums")
], MusicAlbum);
