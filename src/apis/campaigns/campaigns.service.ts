import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCampaignDto } from 'src/dtos/create-campaign.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { Ipfs } from 'src/ipfs/ipfs';
import { Campaign } from 'src/schemas/campaign.schema';
import { Participation } from 'src/schemas/participation.schema';

@Injectable()
export class CampaignsService {
    constructor(
        private readonly ipfs: Ipfs,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
        @InjectModel(Participation.name)
        private readonly participationModel: Model<Participation>,
    ) {}

    async createCampaign(
        createCampaignDto: CreateCampaignDto,
    ): Promise<IpfsResponse> {
        const result = await this.ipfs.upload(createCampaignDto);
        if (result == null) {
            throw new BadRequestException();
        }
        return result;
    }

    async getCampaigns(owner: string): Promise<Campaign[]> {
        if (owner == undefined) {
            return await this.campaignModel.find({ active: true });
        } else {
            return await this.campaignModel.find({
                owner: owner,
                active: true,
            });
        }
    }

    async getCampaign(campaignId: number): Promise<Campaign> {
        const exist = await this.campaignModel.exists({
            campaignId: campaignId,
            active: true,
        });
        if (exist) {
            return await this.campaignModel.findOne({
                campaignId: campaignId,
                active: true,
            });
        } else {
            throw new NotFoundException();
        }
    }

    async getProjects(campaignId: number) {
        const result = await this.participationModel.aggregate([
            {
                $match: {
                    campaignId: campaignId,
                },
            },
            {
                $lookup: {
                    from: 'projects',
                    as: 'project',
                    foreignField: 'projectId',
                    localField: 'projectId',
                },
            },
            {
                $unwind: '$project',
            },
            {
                $replaceRoot: { newRoot: '$project' },
            },
        ]);
        return result;
    }
}
