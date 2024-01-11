import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRoleEnum } from 'src/constants';
import { CreateParticipationDto } from 'src/dtos/create-participation.dto';
import { CreateProjectDto } from 'src/dtos/create-project.dto';
import { GetProjectsDto } from 'src/dtos/get-projects.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { JwtPayload } from 'src/interfaces/jwt-payload.interface';
import { Ipfs } from 'src/ipfs/ipfs';
import { ObjectStorageService } from 'src/object-storage/object-storage.service';
import { Participation } from 'src/schemas/participation.schema';
import { Project } from 'src/schemas/project.schema';

@Injectable()
export class ProjectsService {
    constructor(
        private readonly ipfs: Ipfs,
        private readonly objectStorageService: ObjectStorageService,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
        @InjectModel(Participation.name)
        private readonly participationModel: Model<Participation>,
    ) {}

    async getProjects(getProjectsDto: GetProjectsDto): Promise<Project[]> {
        if (getProjectsDto.member) {
            return await this.projectModel.find({
                members: getProjectsDto.member,
                active: true,
            });
        } else {
            return await this.projectModel.find({});
        }
    }

    async getProject(projectId: number): Promise<Project> {
        const exist = await this.projectModel.exists({
            projectId: projectId,
            active: true,
        });
        if (exist) {
            return await this.projectModel.findOne({
                projectId: projectId,
                active: true,
            });
        } else {
            throw new NotFoundException();
        }
    }

    async createProject(
        createProjectDto: CreateProjectDto,
        jwtPayload: JwtPayload,
    ): Promise<IpfsResponse> {
        if (jwtPayload.role == AuthRoleEnum.BUILDER) {
            const result = await this.ipfs.upload(createProjectDto);
            if (result == null) {
                throw new BadRequestException();
            }
            return result;
        } else {
            throw new UnauthorizedException();
        }
    }

    async getParticipations(projectId: number): Promise<Participation[]> {
        return await this.participationModel.find(
            {
                projectId: projectId,
                active: true,
            },
            {
                projectId: 0,
                _id: 0,
                actionId: 0,
                currentApplicationInfoHash: 0,
                active: 0,
            },
        );
    }

    async getParticipation(
        projectId: number,
        campaignId: number,
    ): Promise<Participation> {
        const exist = await this.participationModel.exists({
            projectId: projectId,
            campaignId: campaignId,
        });
        if (exist) {
            return await this.participationModel.findOne({
                projectId: projectId,
                campaignId: campaignId,
                active: true,
            });
        } else {
            throw new NotFoundException();
        }
    }

    async getFundRaising(projectId: number): Promise<Participation[]> {
        return await this.participationModel.aggregate([
            { $match: { projectId: projectId, active: true } },
            {
                $lookup: {
                    from: 'campaigns',
                    as: 'campaign',
                    foreignField: 'campaignId',
                    localField: 'campaignId',
                    pipeline: [
                        {
                            $match: {
                                active: true,
                            },
                        },
                    ],
                },
            },
            { $unwind: '$campaign' },
            { $project: { campaignId: 0 } },
        ]);
    }

    async createParticipation(
        projectId: number,
        createParticipationDto: CreateParticipationDto,
        jwtPayload: JwtPayload,
    ): Promise<IpfsResponse> {
        // const result = await this.ipfs.upload(createParticipationDto);
        // if (result == null) {
        //     throw new BadRequestException();
        // }
        // return result;
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            const project = await this.projectModel.findOne({
                projectId: projectId,
            });
            if (project) {
                if (project.payeeAccount == jwtPayload.sub) {
                    const result = await this.ipfs.upload(
                        createParticipationDto,
                    );
                    if (result == null) {
                        throw new BadRequestException();
                    }
                    return result;
                } else {
                    throw new UnauthorizedException();
                }
            } else {
                throw new NotFoundException();
            }
        } else {
            throw new UnauthorizedException();
        }
    }
}
