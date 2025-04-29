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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const photo_entity_1 = require("./photo.entity");
const post_entity_1 = require("./post.entity");
const music_entity_1 = require("./music.entity");
const friend_request_entity_1 = require("./friend-request.entity");
const friend_entity_1 = require("./friend.entity");
const message_entity_1 = require("./message.entity");
const conversation_entity_1 = require("./conversation.entity");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, unique: true, nullable: true }) // Временно делаем nullable
    ,
    __metadata("design:type", String)
], User.prototype, "nickname", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ select: false }) // Пароль не будет выбираться по умолчанию
    ,
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => photo_entity_1.Photo, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'avatarId' }),
    __metadata("design:type", photo_entity_1.Photo)
], User.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "avatarId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => photo_entity_1.Photo, photo => photo.user),
    __metadata("design:type", Array)
], User.prototype, "photos", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => post_entity_1.Post, post => post.author),
    __metadata("design:type", Array)
], User.prototype, "posts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => music_entity_1.MusicTrack, track => track.user),
    __metadata("design:type", Array)
], User.prototype, "musicTracks", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => friend_request_entity_1.FriendRequest, request => request.sender),
    __metadata("design:type", Array)
], User.prototype, "sentFriendRequests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => friend_request_entity_1.FriendRequest, request => request.receiver),
    __metadata("design:type", Array)
], User.prototype, "receivedFriendRequests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => friend_entity_1.Friend, friend => friend.user),
    __metadata("design:type", Array)
], User.prototype, "friends", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => friend_entity_1.Friend, friend => friend.friend),
    __metadata("design:type", Array)
], User.prototype, "friendOf", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, message => message.sender),
    __metadata("design:type", Array)
], User.prototype, "sentMessages", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => conversation_entity_1.Conversation, conversation => conversation.participants),
    __metadata("design:type", Array)
], User.prototype, "conversations", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
