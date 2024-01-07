import {
    Controller,
    ForbiddenException,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { Ipfs } from './ipfs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';

@Controller('ipfs')
export class IpfsController {
    constructor(private readonly ipfs: Ipfs) {}

    @Post('upload-file')
    @ApiTags('Ipfs')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1048576 } }))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
    ): Promise<IpfsResponse> {
        return await this.ipfs.uploadFile(file);
    }
}
