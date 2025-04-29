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
exports.PostService = void 0;
const common_1 = require("@nestjs/common");
const post_entity_1 = require("../entities/post.entity");
const db_connect_1 = require("../db/db_connect");
//
let PostService = class PostService {
    constructor() {
        this.postRepository = db_connect_1.AppDataSource.getRepository(post_entity_1.Post);
    }
    async getPostById(id) {
        return await this.postRepository.findOne({
            where: { id },
            relations: ['author', 'photos']
        });
    }
    async getUserPosts(userId) {
        return await this.postRepository.find({
            where: { authorId: userId },
            relations: ['author', 'photos'],
            order: { createdAt: 'DESC' }
        });
    }
    async getGroupPosts(groupId) {
        return await this.postRepository.find({
            where: { groupId },
            relations: ['author', 'photos', 'group'],
            order: { createdAt: 'DESC' }
        });
    }
    async createPost(postData) {
        const post = this.postRepository.create(postData);
        return await this.postRepository.save(post);
    }
    async updatePost(id, postData) {
        await this.postRepository.update(id, postData);
        const updatedPost = await this.postRepository.findOne({ where: { id } });
        if (!updatedPost) {
            throw new common_1.NotFoundException('Пост не найден');
        }
        return updatedPost;
    }
    async deletePost(id) {
        const result = await this.postRepository.delete(id);
        return result.affected !== 0;
    }
};
exports.PostService = PostService;
exports.PostService = PostService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PostService);
