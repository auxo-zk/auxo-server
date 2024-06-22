import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRoleEnum } from 'src/constants';
import { CreateCampaignDto } from 'src/dtos/create-campaign.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { JwtPayload } from 'src/interfaces/jwt-payload.interface';
import { Ipfs } from 'src/ipfs/ipfs';
import { Campaign } from 'src/schemas/campaign.schema';
import { Funding } from 'src/schemas/funding.schema';
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
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
        @InjectModel(Funding.name)
        private readonly fundingModel: Model<Funding>,
    ) {}

    async createCampaign(
        createCampaignDto: CreateCampaignDto,
        jwtPayload: JwtPayload,
    ): Promise<IpfsResponse> {
        if (jwtPayload.role == AuthRoleEnum.ORGANIZER) {
            const result = await this.ipfs.uploadJson(createCampaignDto);
            if (result == null) {
                throw new BadRequestException();
            }
            return result;
        } else {
            throw new UnauthorizedException();
        }
    }

    async getCampaigns(owner: string): Promise<Campaign[]> {
        if (owner == undefined) {
            return await this.campaignModel.aggregate([
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
                { $match: { owner: owner } },
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
        });
        if (exist) {
            const result = await this.campaignModel.aggregate([
                { $match: { campaignId: campaignId } },
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
            return result[0];
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

    async getProjectsNotParticipated(
        campaignId: number,
        projectOwner: string,
    ): Promise<Project[]> {
        const participations = await this.participationModel.find({
            campaignId: campaignId,
        });
        const participatedProjectIds = participations.map(
            (participation) => participation.projectId,
        );
        const result = await this.projectModel.find({
            projectId: {
                $nin: participatedProjectIds,
            },
            'members.0': projectOwner,
        });
        return result ? result : [];
    }

    async getFundings(campaignId: number) {
        const result = await this.fundingModel.aggregate([
            {
                $match: {
                    campaignId: campaignId,
                },
            },
            {
                $group: {
                    _id: '$investor',
                    totalAmount: {
                        $sum: '$amount',
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    investor: '$_id',
                    totalAmount: 1,
                },
            },
        ]);
        return result;
    }
}
