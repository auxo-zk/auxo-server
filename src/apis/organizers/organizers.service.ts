import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRoleEnum } from 'src/constants';
import { UpdateOrganizerDto } from 'src/dtos/update-organizer.dto';
import { FileInformation } from 'src/entities/file-information.entity';
import { JwtPayload } from 'src/interfaces/jwt-payload.interface';
import { ObjectStorageService } from 'src/object-storage/object-storage.service';
import { Campaign } from 'src/schemas/campaign.schema';
import { Organizer } from 'src/schemas/organizer.schema';

@Injectable()
export class OrganizersService {
    constructor(
        private readonly objectStorageService: ObjectStorageService,
        @InjectModel(Organizer.name)
        private readonly organizerModel: Model<Organizer>,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
    ) {}

    async updateOrganizer(
        updateOrganizerDto: UpdateOrganizerDto,
        jwtPayload: JwtPayload,
    ): Promise<Organizer> {
        if (jwtPayload.role != AuthRoleEnum.ORGANIZER) {
            throw new UnauthorizedException();
        } else {
            return await this.organizerModel.findOneAndUpdate(
                { address: jwtPayload.sub },
                {
                    address: jwtPayload.sub,
                    name: updateOrganizerDto.name,
                    website: updateOrganizerDto.website,
                    description: updateOrganizerDto.description,
                },
                { new: true, upsert: true },
            );
        }
    }

    async updateAvatar(
        avatar: Express.Multer.File,
        jwtPayload: JwtPayload,
    ): Promise<FileInformation> {
        if (jwtPayload.role != AuthRoleEnum.ORGANIZER) {
            throw new UnauthorizedException();
        } else {
            const fileInfo = await this.objectStorageService.uploadFile(avatar);
            await this.organizerModel.findOneAndUpdate(
                { address: jwtPayload.sub },
                {
                    img: fileInfo,
                },
                { new: true, upsert: true },
            );
            return fileInfo;
        }
    }

    async getOrganizer(address: string): Promise<Organizer> {
        return (
            (await this.organizerModel.findOne({ address: address })) ||
            ({} as any)
        );
    }

    async getCampaigns(address: string): Promise<Campaign[]> {
        return await this.campaignModel.find({ owner: address });
    }
}
