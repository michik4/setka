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
exports.PostAlbum = void 0;
const typeorm_1 = require("typeorm");
const post_entity_1 = require("./post.entity");
const album_entity_1 = require("./album.entity");
const wall_entity_1 = require("./wall.entity");
let PostAlbum = class PostAlbum {
};
exports.PostAlbum = PostAlbum;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PostAlbum.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostAlbum.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostAlbum.prototype, "albumId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => post_entity_1.Post, { onDelete: 'CASCADE', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'postId', referencedColumnName: 'id' }),
    __metadata("design:type", post_entity_1.Post)
], PostAlbum.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => wall_entity_1.WallPost, { onDelete: 'CASCADE', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'postId', referencedColumnName: 'id' }),
    __metadata("design:type", wall_entity_1.WallPost)
], PostAlbum.prototype, "wallPost", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => album_entity_1.Album, album => album.id, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'albumId', referencedColumnName: 'id' }),
    __metadata("design:type", album_entity_1.Album)
], PostAlbum.prototype, "album", void 0);
exports.PostAlbum = PostAlbum = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Unique)(['postId', 'albumId'])
], PostAlbum);
