import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProjectDto } from 'src/dtos/create-project.dto';
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

    async createProject(
        createProjectDto: CreateProjectDto,
    ): Promise<IpfsResponse> {
        const result = await this.ipfs.upload(createProjectDto);
        if (result == null) {
            throw new BadRequestException();
        }
        return result;
    }

    async getAllProjects(): Promise<Project[]> {
        return await this.projectModel.find({});
    }
}
