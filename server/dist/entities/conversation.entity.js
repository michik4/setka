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
exports.Conversation = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const message_entity_1 = require("./message.entity");
let Conversation = class Conversation {
};
exports.Conversation = Conversation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Conversation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversation.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "isGroup", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => user_entity_1.User),
    (0, typeorm_1.JoinTable)({
        name: 'conversation_participants',
        joinColumn: { name: 'conversation_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], Conversation.prototype, "participants", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, message => message.conversation, { cascade: true }),
    __metadata("design:type", Array)
], Conversation.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Conversation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Conversation.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Conversation.prototype, "lastMessageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: null }),
    __metadata("design:type", String)
], Conversation.prototype, "avatarUrl", void 0);
exports.Conversation = Conversation = __decorate([
    (0, typeorm_1.Entity)('conversations')
], Conversation);
