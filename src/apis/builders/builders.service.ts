import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRoleEnum } from 'src/constants';
import { UpdateBuilderDto } from 'src/dtos/update-builder-profile.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload.interface';
import { Builder } from 'src/schemas/builder.schema';
import { Project } from 'src/schemas/project.schema';

@Injectable()
export class BuildersService {
    constructor(
        @InjectModel(Builder.name)
        private readonly builderModel: Model<Builder>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
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
}
