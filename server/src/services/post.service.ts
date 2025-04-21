import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { AppDataSource } from '../db/db_connect';
//
@Injectable()
export class PostService {
    private postRepository: Repository<Post>;

    constructor() {
        this.postRepository = AppDataSource.getRepository(Post);
    }

    async getPostById(id: number): Promise<Post | null> {
        return await this.postRepository.findOne({ 
            where: { id },
            relations: ['author', 'photos']
        });
    }

    async getUserPosts(userId: number): Promise<Post[]> {
        return await this.postRepository.find({
            where: { authorId: userId },
            relations: ['author', 'photos'],
            order: { createdAt: 'DESC' }
        });
    }

    async getGroupPosts(groupId: number): Promise<Post[]> {
        return await this.postRepository.find({
            where: { groupId },
            relations: ['author', 'photos', 'group'],
            order: { createdAt: 'DESC' }
        });
    }

    async createPost(postData: Partial<Post>): Promise<Post> {
        const post = this.postRepository.create(postData);
        return await this.postRepository.save(post);
    }

    async updatePost(id: number, postData: Partial<Post>): Promise<Post> {
        await this.postRepository.update(id, postData);
        const updatedPost = await this.postRepository.findOne({ where: { id } });
        if (!updatedPost) {
            throw new NotFoundException('Пост не найден');
        }
        return updatedPost;
    }

    async deletePost(id: number): Promise<boolean> {
        const result = await this.postRepository.delete(id);
        return result.affected !== 0;
    }
} 