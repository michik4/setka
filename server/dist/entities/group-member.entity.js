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
exports.GroupMember = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const group_entity_1 = require("./group.entity");
let GroupMember = class GroupMember {
};
exports.GroupMember = GroupMember;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: "id" }),
    __metadata("design:type", Number)
], GroupMember.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "userId" }),
    __metadata("design:type", Number)
], GroupMember.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "groupId" }),
    __metadata("design:type", Number)
], GroupMember.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], GroupMember.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => group_entity_1.Group, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: 'groupId' }),
    __metadata("design:type", group_entity_1.Group)
], GroupMember.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "isAdmin", default: false }),
    __metadata("design:type", Boolean)
], GroupMember.prototype, "isAdmin", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "isCreator", default: false }),
    __metadata("design:type", Boolean)
], GroupMember.prototype, "isCreator", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "createdAt" }),
    __metadata("design:type", Date)
], GroupMember.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updatedAt" }),
    __metadata("design:type", Date)
], GroupMember.prototype, "updatedAt", void 0);
exports.GroupMember = GroupMember = __decorate([
    (0, typeorm_1.Entity)("group_members")
], GroupMember);
