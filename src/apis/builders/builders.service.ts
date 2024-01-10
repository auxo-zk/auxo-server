import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRoleEnum } from 'src/constants';
import { CreateDraftDto } from 'src/dtos/create-draft.dto';
import { UpdateBuilderDto } from 'src/dtos/update-builder.dto';
import { UpdateDraftDto } from 'src/dtos/update-draft.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload.interface';
import { ObjectStorageService } from 'src/object-storage/object-storage.service';
import { Builder } from 'src/schemas/builder.schema';
import { Draft } from 'src/schemas/draft.schema';
import { Project } from 'src/schemas/project.schema';

@Injectable()
export class BuildersService {
    constructor(
        private readonly objectStorageService: ObjectStorageService,
        @InjectModel(Builder.name)
        private readonly builderModel: Model<Builder>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
        @InjectModel(Draft.name)
        private readonly draftModel: Model<Draft>,
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

    async getDrafts(jwtPayload: JwtPayload): Promise<Draft[]> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            return await this.draftModel.find({ address: jwtPayload.sub });
        }
    }

    async getDraft(draftId: string, jwtPayload: JwtPayload): Promise<Draft> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            return (
                (await this.draftModel.findOne({
                    _id: draftId,
                    address: jwtPayload.sub,
                })) || ({} as any)
            );
        }
    }

    async createDraft(
        createDraftDto: CreateDraftDto,
        jwtPayload: JwtPayload,
    ): Promise<Draft> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            return await this.draftModel.create({
                address: jwtPayload.sub,
                name: createDraftDto.name,
                publicKey: createDraftDto.publicKey,
                description: createDraftDto.description,
                problemStatement: createDraftDto.problemStatement,
                solution: createDraftDto.solution,
                challengeAndRisks: createDraftDto.challengeAndRisks,
                members: createDraftDto.members,
                documents: createDraftDto.documents,
            });
        }
    }

    async updateDraft(
        draftId: string,
        updateDraftDto: UpdateDraftDto,
        jwtPayload: JwtPayload,
    ): Promise<Draft> {
        if (jwtPayload.role != AuthRoleEnum.BUILDER) {
            throw new UnauthorizedException();
        } else {
            const exist = await this.draftModel.exists({
                _id: draftId,
                address: jwtPayload.sub,
            });
            if (exist) {
                return await this.draftModel.findOneAndUpdate(
                    { _id: draftId, address: jwtPayload.sub },
                    {
                        name: updateDraftDto.name,
                        publicKey: updateDraftDto.publicKey,
                        description: updateDraftDto.description,
                        problemStatement: updateDraftDto.problemStatement,
                        solution: updateDraftDto.solution,
                        challengeAndRisks: updateDraftDto.challengeAndRisks,
                        members: updateDraftDto.members,
                        documents: updateDraftDto.documents,
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
            const exist = await this.draftModel.exists({
                _id: draftId,
                address: jwtPayload.sub,
            });
            if (exist) {
                await this.draftModel.deleteOne({
                    _id: draftId,
                    address: jwtPayload.sub,
                });
            } else {
                throw new NotFoundException();
            }
        }
    }
}
