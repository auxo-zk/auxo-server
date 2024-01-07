import {
    Controller,
    FileTypeValidator,
    Get,
    Param,
    ParseFilePipe,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { MinIoService } from './min-io.service';
import { MinIoResponse } from 'src/entities/minio-response.entity';

@Controller('min-io')
export class MinIoController {
    constructor(private readonly minIoService: MinIoService) {}

    @Post('upload-image')
    @ApiTags('MinIO')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { image: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(FileInterceptor('image'))
    async uploadImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: [new FileTypeValidator({ fileType: 'image/*' })],
            }),
        )
        image: Express.Multer.File,
    ): Promise<MinIoResponse> {
        return await this.minIoService.uploadImage(image);
    }

    @Get('image-url/:fileName')
    @ApiTags('MinIO')
    async getImageUrl(@Param('fileName') fileName: string): Promise<string> {
        return await this.minIoService.getImageUrl(fileName);
    }
}
