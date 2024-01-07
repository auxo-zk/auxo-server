import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UseInterceptors,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from 'src/dtos/create-project.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { Project } from 'src/schemas/project.schema';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { GetProjectsDto } from 'src/dtos/get-projects.dto';

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

    @Get('/:projectId')
    @ApiTags('Project')
    async getProject(
        @Param('projectId', ParseIntPipe) projectId: number,
    ): Promise<Project> {
        return await this.projectsService.getProject(projectId);
    }

    @Post()
    @ApiTags('Project')
    async createProject(
        @Body() createProjectDto: CreateProjectDto,
    ): Promise<IpfsResponse> {
        return await this.projectsService.createProject(createProjectDto);
    }
}
