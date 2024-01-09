import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRoleEnum } from 'src/constants';
import { CreateDraftDto } from 'src/dtos/create-draft.dto';
import { UpdateBuilderDto } from 'src/dtos/update-builder-profile.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload.interface';
import { Builder } from 'src/schemas/builder.schema';
import { Draft } from 'src/schemas/draft.schema';
import { Project } from 'src/schemas/project.schema';

@Injectable()
export class BuildersService {
    constructor(
        @InjectModel(Builder.name)
        private readonly builderModel: Model<Builder>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
        @InjectModel(Draft.name)
        private readonly draftModel: Model<Draft>,
    ) {}

    async getBuilder(address: string): Promise<Builder> {
        return await this.builderModel.findOne({ address: address });
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
                    img: updateBuilderDto.img,
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
            console.log(jwtPayload.sub);
            return await this.draftModel.find({ address: jwtPayload.sub });
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
}
