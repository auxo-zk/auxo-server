import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { BuildersService } from './builders.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { UpdateBuilderDto } from 'src/dtos/update-builder-profile.dto';
import { Builder } from 'src/schemas/builder.schema';
import { Project } from 'src/schemas/project.schema';
import { CreateDraftDto } from 'src/dtos/create-draft.dto';
import { Draft } from 'src/schemas/draft.schema';

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

    @Get('drafts')
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async getDrafts(@Request() req: any): Promise<Draft[]> {
        return await this.buildersService.getDrafts(req.user);
    }

    @Post('drafts')
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async createDraft(
        @Body() createDraftDto: CreateDraftDto,
        @Request() req: any,
    ): Promise<Draft> {
        return await this.buildersService.createDraft(createDraftDto, req.user);
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
