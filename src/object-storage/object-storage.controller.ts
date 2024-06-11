import {
    Controller,
    Get,
    Param,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { ObjectStorageService } from './object-storage.service';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileInformation } from 'src/entities/file-information.entity';

@Controller('object-storage')
export class ObjectStorageController {
    constructor(private readonly objectStorageService: ObjectStorageService) {}

    // limit 50MB
    @Post()
    @ApiTags('Object Storage')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', { limits: { fileSize: 52428800 } }),
    )
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
    ): Promise<FileInformation> {
        return await this.objectStorageService.uploadFile(file);
    }
}
