import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Request,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from 'src/dtos/create-project.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { Project } from 'src/schemas/project.schema';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { GetProjectsDto } from 'src/dtos/get-projects.dto';
import { Participation } from 'src/schemas/participation.schema';
import { AuthGuard } from '../auth/auth.guard';
import { CreateParticipationDto } from 'src/dtos/create-participation.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Get()
    @ApiTags('Project')
    @CacheTTL(30000)
    @UseInterceptors(CacheInterceptor)
    async getProjects(
        @Query() getProjectsDto: GetProjectsDto,
    ): Promise<Project[]> {
        return await this.projectsService.getProjects(getProjectsDto);
    }

    @Post()
    @ApiTags('Project')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async createProject(
        @Body() createProjectDto: CreateProjectDto,
        @Request() req: any,
    ): Promise<IpfsResponse> {
        return await this.projectsService.createProject(
            createProjectDto,
            req.user,
        );
    }

    @Get(':projectId')
    @ApiTags('Project')
    async getProject(
        @Param('projectId', ParseIntPipe) projectId: number,
    ): Promise<Project> {
        return await this.projectsService.getProject(projectId);
    }

    @Get(':projectId/participations')
    @ApiTags('Project')
    async getParticipations(
        @Param('projectId', ParseIntPipe) projectId: number,
    ): Promise<Participation[]> {
        return await this.projectsService.getParticipations(projectId);
    }

    @Post(':projectId/participations/')
    @ApiTags('Project')
    @UseInterceptors(FilesInterceptor('documents'))
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async createParticipation(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() createParticipationDto: CreateParticipationDto,
        @Request() req: any,
    ): Promise<IpfsResponse> {
        return await this.projectsService.createParticipation(
            projectId,
            createParticipationDto,
            req.user,
        );
    }

    @Get(':projectId/participations/:campaignId')
    @ApiTags('Project')
    async getParticipation(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('campaignId', ParseIntPipe) campaignId: number,
    ): Promise<Participation> {
        return await this.projectsService.getParticipation(
            projectId,
            campaignId,
        );
    }

    @Get(':projectId/fund-raising')
    @ApiTags('Project')
    async getFundRaising(@Param('projectId', ParseIntPipe) projectId: number) {
        return this.projectsService.getFundRaising(projectId);
    }
}
