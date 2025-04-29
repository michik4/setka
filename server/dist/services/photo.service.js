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
exports.PhotoService = void 0;
const common_1 = require("@nestjs/common");
const photo_entity_1 = require("../entities/photo.entity");
const db_connect_1 = require("../db/db_connect");
let PhotoService = class PhotoService {
    constructor() {
        this.photoRepository = db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo);
    }
    async getPhotoById(id) {
        return await this.photoRepository.findOne({ where: { id } });
    }
    async getUserPhotos(userId) {
        return await this.photoRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' }
        });
    }
    async deletePhoto(id) {
        const result = await this.photoRepository.update(id, { isDeleted: true });
        return result.affected !== 0;
    }
};
exports.PhotoService = PhotoService;
exports.PhotoService = PhotoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PhotoService);
