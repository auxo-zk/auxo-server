import {
    Controller,
    FileTypeValidator,
    ForbiddenException,
    ParseFilePipe,
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

    @Post('upload-json')
    @ApiTags('Ipfs')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1048576 } }))
    async uploadJson(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({ fileType: 'application/json' }),
                ],
            }),
        )
        file: Express.Multer.File,
    ): Promise<IpfsResponse> {
        return await this.ipfs.uploadJsonFile(file);
    }
}
