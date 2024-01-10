import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProjectDto } from 'src/dtos/create-project.dto';
import { GetProjectsDto } from 'src/dtos/get-projects.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { Ipfs } from 'src/ipfs/ipfs';
import { Project } from 'src/schemas/project.schema';

@Injectable()
export class ProjectsService {
    constructor(
        private readonly ipfs: Ipfs,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
    ) {}

    async getProjects(getProjectsDto: GetProjectsDto): Promise<Project[]> {
        if (getProjectsDto.member) {
            return await this.projectModel.find({
                members: getProjectsDto.member,
            });
        } else {
            return await this.projectModel.find({});
        }
    }

    async getProject(projectId: number): Promise<Project> {
        const exist = await this.projectModel.exists({ projectId: projectId });
        if (exist) {
            return await this.projectModel.findOne({ projectId: projectId });
        } else {
            throw new NotFoundException();
        }
    }

    async createProject(
        createProjectDto: CreateProjectDto,
    ): Promise<IpfsResponse> {
        const result = await this.ipfs.upload(createProjectDto);
        if (result == null) {
            throw new BadRequestException();
        }
        return result;
    }
}
