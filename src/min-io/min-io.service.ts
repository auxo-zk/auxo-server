import { Injectable } from '@nestjs/common';
import * as MinIo from 'minio';
import { MinIoResponse } from 'src/entities/minio-response.entity';

@Injectable()
export class MinIoService {
    private minIoClient: MinIo.Client;
    private imageBucket: string;

    constructor() {
        this.minIoClient = new MinIo.Client({
            endPoint: process.env.MIN_IO_ENDPOINT,
            port: Number(process.env.MIN_IO_PORT),
            useSSL: false,
            accessKey: process.env.MIN_IO_ACCESS_KEY,
            secretKey: process.env.MIN_IO_SECRET_KEY,
        });
        this.imageBucket = process.env.MIN_IO_IMAGE_BUCKET;
    }

    async createBucketIfNotExist(bucketName: string) {
        const bucketExisted = await this.minIoClient.bucketExists(bucketName);
        if (!bucketExisted) {
            await this.minIoClient.makeBucket(bucketName);
        }
    }

    async uploadImage(image: Express.Multer.File): Promise<MinIoResponse> {
        const fileName = `${Date.now()}-${image.originalname}`;
        await this.minIoClient.putObject(
            this.imageBucket,
            fileName,
            image.buffer,
            image.size,
        );

        return {
            bucketName: this.imageBucket,
            fileName: fileName,
            url: await this.getImageUrl(fileName),
        };
    }

    async getImageUrl(fileName: string): Promise<string> {
        return await this.minIoClient.presignedUrl(
            'GET',
            this.imageBucket,
            fileName,
        );
    }

    async deleteImage(fileName: string) {
        await this.minIoClient.removeObject(this.imageBucket, fileName);
    }
}
