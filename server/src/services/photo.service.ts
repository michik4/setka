import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Photo } from '../entities/photo.entity';
import { AppDataSource } from '../db/db_connect';

@Injectable()
export class PhotoService {
    private photoRepository: Repository<Photo>;

    constructor() {
        this.photoRepository = AppDataSource.getRepository(Photo);
    }

    async getPhotoById(id: number): Promise<Photo | null> {
        return await this.photoRepository.findOne({ where: { id } });
    }

    async getUserPhotos(userId: number): Promise<Photo[]> {
        return await this.photoRepository.find({ 
            where: { userId },
            order: { createdAt: 'DESC' }
        });
    }

    async deletePhoto(id: number): Promise<boolean> {
        const result = await this.photoRepository.update(
            id, 
            { isDeleted: true }
        );
        return result.affected !== 0;
    }
} 