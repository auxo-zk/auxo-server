import {
    Body,
    Controller,
    Delete,
    FileTypeValidator,
    Get,
    Param,
    ParseFilePipe,
    Post,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { BuildersService } from './builders.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { UpdateBuilderDto } from 'src/dtos/update-builder.dto';
import { Builder } from 'src/schemas/builder.schema';
import { Project } from 'src/schemas/project.schema';
import { CreateProjectDraftDto } from 'src/dtos/create-project-draft.dto';
import { ProjectDraft } from 'src/schemas/draft.schema';
import { UpdateProjectDraftDto } from 'src/dtos/update-project-draft.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('builders')
export class BuildersController {
    constructor(private readonly buildersService: BuildersService) {}

    @Post()
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async updateBuilder(
        @Body() updateBuilderDto: UpdateBuilderDto,
        @Request() req: any,
    ): Promise<Builder> {
        return await this.buildersService.updateBuilder(
            updateBuilderDto,
            req.user,
        );
    }

    @Post('update-avatar')
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { avatar: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(
        FileInterceptor('avatar', { limits: { fileSize: 10485760 } }),
    )
    async updateAvatar(
        @UploadedFile(
            new ParseFilePipe({
                validators: [new FileTypeValidator({ fileType: 'image/*' })],
            }),
        )
        avatar: Express.Multer.File,
        @Request() req: any,
    ): Promise<string> {
        return await this.buildersService.updateAvatar(avatar, req.user);
    }

    @Get('drafts')
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async getDrafts(@Request() req: any): Promise<ProjectDraft[]> {
        return await this.buildersService.getDrafts(req.user);
    }

    @Get('drafts/:draftId')
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async getDraft(
        @Param('draftId') draftId: string,
        @Request() req: any,
    ): Promise<ProjectDraft> {
        return await this.buildersService.getDraft(draftId, req.user);
    }

    @Post('drafts/:draftId')
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async updateDraft(
        @Param('draftId') draftId: string,
        @Body() updateProjectDraftDto: UpdateProjectDraftDto,
        @Request() req: any,
    ): Promise<ProjectDraft> {
        return await this.buildersService.updateDraft(
            draftId,
            updateProjectDraftDto,
            req.user,
        );
    }

    @Delete('drafts/:draftId')
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async deleteDraft(
        @Param('draftId') draftId: string,
        @Request() req: any,
    ): Promise<void> {
        await this.buildersService.deleteDraft(draftId, req.user);
    }

    @Post('drafts')
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async createDraft(
        @Body() createProjectDraftDto: CreateProjectDraftDto,
        @Request() req: any,
    ): Promise<ProjectDraft> {
        return await this.buildersService.createDraft(
            createProjectDraftDto,
            req.user,
        );
    }

    @Get(':address/projects')
    @ApiTags('Builder')
    async getProjects(@Param('address') address: string): Promise<Project[]> {
        return await this.buildersService.getProjects(address);
    }

    @Get(':address')
    @ApiTags('Builder')
    async getBuilder(@Param('address') address: string): Promise<Builder> {
        return await this.buildersService.getBuilder(address);
    }
}
