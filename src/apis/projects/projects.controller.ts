import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from 'src/dtos/create-project.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { Project } from 'src/schemas/project.schema';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Get()
    @ApiTags('Project')
    @CacheTTL(30000)
    @UseInterceptors(CacheInterceptor)
    async getAllProjects(): Promise<Project[]> {
        return await this.projectsService.getAllProjects();
    }

    @Post()
    @ApiTags('Project')
    async createProject(
        @Body() createProjectDto: CreateProjectDto,
    ): Promise<IpfsResponse> {
        return await this.projectsService.createProject(createProjectDto);
    }
}
