import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { Ipfs } from './ipfs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IpfsResponse } from 'src/interfaces/ipfs-response.interface';

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
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
    ): Promise<IpfsResponse> {
        const response = await this.ipfs.uploadFile(file);
        return response;
    }
}
