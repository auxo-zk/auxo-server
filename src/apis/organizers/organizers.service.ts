import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRoleEnum } from 'src/constants';
import { UpdateOrganizerDto } from 'src/dtos/update-organizer.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload.interface';
import { Organizer } from 'src/schemas/organizer.schema';

@Injectable()
export class OrganizersService {
    constructor(
        @InjectModel(Organizer.name)
        private readonly organizerModel: Model<Organizer>,
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
                    img: updateOrganizerDto.img,
                },
                { new: true, upsert: true },
            );
        }
    }

    async getOrganizer(address: string): Promise<Organizer> {
        return (
            (await this.organizerModel.findOne({ address: address })) ||
            ({} as any)
        );
    }
}
