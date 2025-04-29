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
exports.WallPost = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const photo_entity_1 = require("./photo.entity");
const music_entity_1 = require("./music.entity");
let WallPost = class WallPost {
};
exports.WallPost = WallPost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WallPost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], WallPost.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WallPost.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WallPost.prototype, "wallOwnerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'authorId' }),
    __metadata("design:type", user_entity_1.User)
], WallPost.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'wallOwnerId' }),
    __metadata("design:type", user_entity_1.User)
], WallPost.prototype, "wallOwner", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => photo_entity_1.Photo),
    (0, typeorm_1.JoinTable)({
        name: "wall_posts_photos",
        joinColumn: {
            name: "wallPostId",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "photoId",
            referencedColumnName: "id"
        }
    }),
    __metadata("design:type", Array)
], WallPost.prototype, "photos", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => music_entity_1.MusicTrack),
    (0, typeorm_1.JoinTable)({
        name: "wall_posts_tracks",
        joinColumn: {
            name: "wallPostId",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "trackId",
            referencedColumnName: "id"
        }
    }),
    __metadata("design:type", Array)
], WallPost.prototype, "tracks", void 0);
__decorate([
    (0, typeorm_1.Column)("int", { default: 0 }),
    __metadata("design:type", Number)
], WallPost.prototype, "likesCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WallPost.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WallPost.prototype, "updatedAt", void 0);
exports.WallPost = WallPost = __decorate([
    (0, typeorm_1.Entity)('wall_posts')
], WallPost);
