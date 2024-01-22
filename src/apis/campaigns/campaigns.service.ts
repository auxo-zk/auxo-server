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
import { FundingResult } from 'src/schemas/funding-result.schema';
import { Participation } from 'src/schemas/participation.schema';
import { Project } from 'src/schemas/project.schema';

@Injectable()
export class CampaignsService {
    constructor(
        private readonly ipfs: Ipfs,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
        @InjectModel(Participation.name)
        private readonly participationModel: Model<Participation>,
        @InjectModel(FundingResult.name)
        private readonly fundingResultModel: Model<FundingResult>,
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

    async getCampaigns(owner: string, active: boolean): Promise<Campaign[]> {
        if (owner == undefined) {
            return await this.campaignModel.aggregate([
                { $match: { active: active } },
                {
                    $lookup: {
                        from: 'organizers',
                        as: 'ownerInfo',
                        foreignField: 'address',
                        localField: 'owner',
                    },
                },
                {
                    $addFields: {
                        ownerInfo: {
                            $cond: {
                                if: { $eq: [{ $size: '$ownerInfo' }, 0] },
                                then: null, // If array is empty, set to null
                                else: { $arrayElemAt: ['$ownerInfo', 0] }, // Otherwise, set to the first element
                            },
                        },
                    },
                },
            ]);
        } else {
            return await this.campaignModel.aggregate([
                { $match: { owner: owner, active: active } },
                {
                    $lookup: {
                        from: 'organizers',
                        as: 'ownerInfo',
                        foreignField: 'address',
                        localField: 'owner',
                    },
                },
                {
                    $addFields: {
                        ownerInfo: {
                            $cond: {
                                if: { $eq: [{ $size: '$ownerInfo' }, 0] },
                                then: null, // If array is empty, set to null
                                else: { $arrayElemAt: ['$ownerInfo', 0] }, // Otherwise, set to the first element
                            },
                        },
                    },
                },
            ]);
        }
    }

    async getCampaign(campaignId: number): Promise<Campaign> {
        const exist = await this.campaignModel.exists({
            campaignId: campaignId,
            active: true,
        });
        if (exist) {
            const result = await this.campaignModel.aggregate([
                { $match: { campaignId: campaignId, active: true } },
                {
                    $lookup: {
                        from: 'organizers',
                        as: 'ownerInfo',
                        foreignField: 'address',
                        localField: 'owner',
                    },
                },
                {
                    $addFields: {
                        ownerInfo: {
                            $cond: {
                                if: { $eq: [{ $size: '$ownerInfo' }, 0] },
                                then: null, // If array is empty, set to null
                                else: { $arrayElemAt: ['$ownerInfo', 0] }, // Otherwise, set to the first element
                            },
                        },
                    },
                },
            ]);
            return result[1];
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

    async getCampaignResult(campaignId: number): Promise<{ projects: any }> {
        const exist = await this.campaignModel.exists({
            campaignId: campaignId,
        });
        if (exist) {
            const projects = await this.participationModel.aggregate([
                { $match: { campaignId: campaignId, active: true } },
                { $sort: { actionId: 1 } },
                { $project: { campaignId: 0, active: 0, actionId: 0, _id: 0 } },
                {
                    $addFields: {
                        totalRaising: {
                            $sum: '$ipfsData.scopeOfWorks.raisingAmount',
                        },
                        totalFunded: '0',
                    },
                },
            ]);
            return {
                projects: projects,
            };
        } else {
            throw new NotFoundException();
        }
    }
}
