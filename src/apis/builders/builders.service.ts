import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRoleEnum } from 'src/constants';
import { CreateProjectDraftDto } from 'src/dtos/create-project-draft.dto';
import { UpdateBuilderDto } from 'src/dtos/update-builder.dto';
import { UpdateProjectDraftDto } from 'src/dtos/update-project-draft.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload.interface';
import { ObjectStorageService } from 'src/object-storage/object-storage.service';
import { Builder } from 'src/schemas/builder.schema';
import { ProjectDraft } from 'src/schemas/draft.schema';
import { Project } from 'src/schemas/project.schema';

@Injectable()
export class BuildersService {
    constructor(
        private readonly objectStorageService: ObjectStorageService,
        @InjectModel(Builder.name)
        private readonly builderModel: Model<Builder>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
        @InjectModel(ProjectDraft.name)
        private readonly projectDraftModel: Model<ProjectDraft>,
    ) {}

    async getBuilder(address: string): Promise<Builder> {
        return (
            (await this.builderModel.findOne({ address: address })) ||
            ({} as any)
        );
    }

    async updateAvatar(
        avatar: Express.Multer.File,
        jwtPayload: JwtPayload,
    ): Promise<string> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            const avatarUrl =
                await this.objectStorageService.uploadFile(avatar);
            await this.builderModel.findOneAndUpdate(
                { address: jwtPayload.sub },
                {
                    img: avatarUrl,
                },
                { new: true, upsert: true },
            );
            return avatarUrl;
        }
    }

    async updateBuilder(
        updateBuilderDto: UpdateBuilderDto,
        jwtPayload: JwtPayload,
    ): Promise<Builder> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            return await this.builderModel.findOneAndUpdate(
                { address: jwtPayload.sub },
                {
                    address: jwtPayload.sub,
                    name: updateBuilderDto.name,
                    role: updateBuilderDto.role,
                    link: updateBuilderDto.link,
                    description: updateBuilderDto.description,
                },
                { new: true, upsert: true },
            );
        }
    }

    async getProjects(address: string): Promise<Project[]> {
        return await this.projectModel.find({ members: address });
    }

    async getDrafts(jwtPayload: JwtPayload): Promise<ProjectDraft[]> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            return await this.projectDraftModel.find({
                address: jwtPayload.sub,
            });
        }
    }

    async getDraft(
        draftId: string,
        jwtPayload: JwtPayload,
    ): Promise<ProjectDraft> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            return (
                (await this.projectDraftModel.findOne({
                    _id: draftId,
                    address: jwtPayload.sub,
                })) || ({} as any)
            );
        }
    }

    async createDraft(
        createProjectDraftDto: CreateProjectDraftDto,
        jwtPayload: JwtPayload,
    ): Promise<ProjectDraft> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            return await this.projectDraftModel.create({
                address: jwtPayload.sub,
                name: createProjectDraftDto.name,
                avatarImage: createProjectDraftDto.avatarImage,
                coverImage: createProjectDraftDto.coverImage,
                publicKey: createProjectDraftDto.publicKey,
                description: createProjectDraftDto.description,
                members: createProjectDraftDto.members,
                documents: createProjectDraftDto.documents,
            });
        }
    }

    async updateDraft(
        draftId: string,
        updateProjectDraftDto: UpdateProjectDraftDto,
        jwtPayload: JwtPayload,
    ): Promise<ProjectDraft> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            const exist = await this.projectDraftModel.exists({
                _id: draftId,
                address: jwtPayload.sub,
            });
            if (exist) {
                return await this.projectDraftModel.findOneAndUpdate(
                    { _id: draftId, address: jwtPayload.sub },
                    {
                        name: updateProjectDraftDto.name,
                        avatarImage: updateProjectDraftDto.publicKey,
                        coverImage: updateProjectDraftDto.coverImage,
                        publicKey: updateProjectDraftDto.publicKey,
                        description: updateProjectDraftDto.description,
                        members: updateProjectDraftDto.members,
                        documents: updateProjectDraftDto.documents,
                    },
                    { new: true, upsert: true },
                );
            } else {
                throw new NotFoundException();
            }
        }
    }

    async deleteDraft(draftId: string, jwtPayload: JwtPayload): Promise<void> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            const exist = await this.projectDraftModel.exists({
                _id: draftId,
                address: jwtPayload.sub,
            });
            if (exist) {
                await this.projectDraftModel.deleteOne({
                    _id: draftId,
                    address: jwtPayload.sub,
                });
            } else {
                throw new NotFoundException();
            }
        }
    }
}
