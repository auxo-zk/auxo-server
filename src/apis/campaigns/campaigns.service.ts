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

@Injectable()
export class CampaignsService {
    constructor(
        private readonly ipfs: Ipfs,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
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
        return await this.campaignModel.find({ owner: owner });
    }

    async getCampaign(campaignId: number): Promise<Campaign> {
        const exist = await this.campaignModel.exists({
            campaignId: campaignId,
        });
        if (exist) {
            return await this.campaignModel.findOne({ campaignId: campaignId });
        } else {
            throw new NotFoundException();
        }
    }
}
