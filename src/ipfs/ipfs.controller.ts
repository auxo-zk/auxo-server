import {
    Body,
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { Ipfs } from './ipfs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CreateCommitteeDto } from 'src/dtos/create-committee.dto';

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
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        const response = await this.ipfs.uploadFile(file);
        return response;
    }

    @Post('create-committee')
    @ApiTags('Ipfs')
    async createCommittee(@Body() createCommitteeDto: CreateCommitteeDto) {
        const response = await this.ipfs.upload(createCommitteeDto);
        return response;
    }
}
