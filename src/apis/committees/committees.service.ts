import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MemberRoleEnum } from 'src/constants';
import { CreateCommitteeDto } from 'src/dtos/create-committee.dto';
import { GetCommitteesDto } from 'src/dtos/get-committees.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { Ipfs } from 'src/ipfs/ipfs';
import { Committee } from 'src/schemas/committee.schema';
import { Key } from 'src/schemas/key.schema';
import { DkgRequest } from 'src/schemas/request.schema';

@Injectable()
export class CommitteesService {
    constructor(
        private readonly ipfs: Ipfs,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
    ) {}

    async getCommittees(
        getCommitteesDto: GetCommitteesDto,
    ): Promise<Committee[]> {
        let committees: Committee[];
        if (
            getCommitteesDto.member != undefined &&
            getCommitteesDto.role != undefined
        ) {
            if (getCommitteesDto.role == MemberRoleEnum.OWNER) {
                committees = await this.committeeModel.aggregate([
                    { $match: { 'ipfsData.creator': getCommitteesDto.member } },
                    {
                        $lookup: {
                            from: 'keys',
                            as: 'keys',
                            localField: 'committeeId',
                            foreignField: 'committeeId',
                            pipeline: [
                                {
                                    $project: {
                                        keyId: 1,
                                        publicKey: 1,
                                        status: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'requests',
                            localField: 'committeeId',
                            foreignField: 'committeeId',
                            pipeline: [
                                { $project: { requestId: 1, requester: 1 } },
                            ],
                        },
                    },
                ]);
            } else if (getCommitteesDto.role == MemberRoleEnum.MEMBER) {
                committees = await this.committeeModel.aggregate([
                    {
                        $match: {
                            'ipfsData.creator': {
                                $ne: getCommitteesDto.member,
                            },
                            publicKeys: getCommitteesDto.member,
                        },
                    },
                    {
                        $lookup: {
                            from: 'keys',
                            as: 'keys',
                            localField: 'committeeId',
                            foreignField: 'committeeId',
                            pipeline: [
                                {
                                    $project: {
                                        keyId: 1,
                                        publicKey: 1,
                                        status: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'requests',
                            localField: 'committeeId',
                            foreignField: 'committeeId',
                            pipeline: [
                                { $project: { requestId: 1, requester: 1 } },
                            ],
                        },
                    },
                ]);
            } else {
                committees = await this.committeeModel.aggregate([
                    {
                        $match: {
                            publicKeys: getCommitteesDto.member,
                        },
                    },
                    {
                        $lookup: {
                            from: 'keys',
                            as: 'keys',
                            localField: 'committeeId',
                            foreignField: 'committeeId',
                            pipeline: [
                                {
                                    $project: {
                                        keyId: 1,
                                        publicKey: 1,
                                        status: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'requests',
                            localField: 'committeeId',
                            foreignField: 'committeeId',
                            pipeline: [
                                { $project: { requestId: 1, requester: 1 } },
                            ],
                        },
                    },
                ]);
            }
        } else if (getCommitteesDto.member != undefined) {
            committees = await this.committeeModel.aggregate([
                {
                    $match: {
                        publicKeys: getCommitteesDto.member,
                    },
                },
                {
                    $lookup: {
                        from: 'keys',
                        as: 'keys',
                        localField: 'committeeId',
                        foreignField: 'committeeId',
                        pipeline: [
                            {
                                $project: {
                                    keyId: 1,
                                    publicKey: 1,
                                    status: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: 'dkgrequests',
                        as: 'requests',
                        localField: 'committeeId',
                        foreignField: 'committeeId',
                        pipeline: [
                            { $project: { requestId: 1, requester: 1 } },
                        ],
                    },
                },
            ]);
        } else {
            committees = await this.committeeModel.aggregate([
                {
                    $match: {},
                },
                {
                    $lookup: {
                        from: 'keys',
                        as: 'keys',
                        localField: 'committeeId',
                        foreignField: 'committeeId',
                        pipeline: [
                            {
                                $project: {
                                    keyId: 1,
                                    publicKey: 1,
                                    status: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: 'dkgrequests',
                        as: 'requests',
                        localField: 'committeeId',
                        foreignField: 'committeeId',
                        pipeline: [
                            { $project: { requestId: 1, requester: 1 } },
                        ],
                    },
                },
            ]);
        }
        return committees;
    }

    async createCommittee(
        createCommitteeDto: CreateCommitteeDto,
    ): Promise<IpfsResponse> {
        const result = await this.ipfs.uploadJson(createCommitteeDto);
        if (result == null) {
            throw new BadRequestException();
        }
        return result;
    }

    async getCommittee(committeeId: number): Promise<Committee> {
        return this.committeeModel.findOne({ committeeId: committeeId });
    }

    async getKeys(committeeId: number): Promise<Key[]> {
        return this.keyModel.find(
            { committeeId: committeeId },
            {},
            { sort: { keyId: 1 } },
        );
    }

    async getKey(committeeId: number, keyId: number): Promise<Key> {
        return this.keyModel.findOne({
            committeeId: committeeId,
            keyId: keyId,
        });
    }

    async getRequests(committeeId: number): Promise<DkgRequest[]> {
        const keys = await this.keyModel.find({ committeeId: committeeId });
        const keyIndexes = keys.map((key) => Number(key._id));
        const result = await this.dkgRequestModel.find({
            keyIndex: { $in: keyIndexes },
        });
        return result;
    }
}
