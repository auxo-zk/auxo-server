import { BadRequestException, Injectable } from '@nestjs/common';
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
import { DkgResponse } from 'src/schemas/response.schema';
import { Round1 } from 'src/schemas/round-1.schema';
import { Round2 } from 'src/schemas/round-2.schema';

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

    async getAllCommittees(
        getCommitteesDto: GetCommitteesDto,
    ): Promise<Committee[]> {
        let committees: Committee[];
        if (
            getCommitteesDto.member != undefined &&
            getCommitteesDto.role != undefined
        ) {
            if (getCommitteesDto.role == MemberRoleEnum.OWNER) {
                committees = await this.committeeModel.aggregate([
                    { $match: { creator: getCommitteesDto.member } },
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
                            creator: { $ne: getCommitteesDto.member },
                            publicKeys: getCommitteesDto.member,
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
        } else {
            committees = await this.committeeModel.aggregate([
                {
                    $match: {},
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
        const result = await this.ipfs.upload(createCommitteeDto);
        if (result == null) {
            throw new BadRequestException();
        }
        return result;
    }

    async getCommittee(committeeId: number): Promise<Committee> {
        const result = await this.committeeModel.aggregate([
            { $match: { committeeId: committeeId } },
            {
                $lookup: {
                    from: 'dkgrequests',
                    as: 'requests',
                    localField: 'committeeId',
                    foreignField: 'committeeId',
                    pipeline: [
                        {
                            $match: {
                                active: true,
                            },
                        },
                        { $project: { requestId: 1, requester: 1 } },
                    ],
                },
            },
        ]);

        if (result.length > 0) {
            return result[0];
        } else {
            return null;
        }
    }

    async getKeys(committeeId: number): Promise<Key[]> {
        const result = await this.keyModel.aggregate([
            { $match: { committeeId: committeeId } },
            {
                $lookup: {
                    from: 'round1',
                    as: 'round1s',
                    localField: 'keyId',
                    foreignField: 'keyId',
                    pipeline: [
                        { $match: { committeeId: committeeId, active: true } },
                        {
                            $sort: {
                                memberId: 1,
                            },
                        },
                        {
                            $project: {
                                memberId: 1,
                                contribution: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'round2',
                    as: 'round2s',
                    localField: 'keyId',
                    foreignField: 'keyId',
                    pipeline: [
                        { $match: { committeeId: committeeId, active: true } },
                        {
                            $sort: {
                                memberId: 1,
                            },
                        },
                        {
                            $project: {
                                memberId: 1,
                                contribution: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'dkgrequests',
                    as: 'requests',
                    localField: 'keyId',
                    foreignField: 'keyId',
                    pipeline: [
                        { $match: { committeeId: committeeId } },
                        {
                            $sort: {
                                memberId: 1,
                            },
                        },
                        {
                            $project: {
                                requestId: 1,
                                requester: 1,
                            },
                        },
                    ],
                },
            },
        ]);

        return result;
    }

    async getRequests(committeeId: number): Promise<DkgRequest[]> {
        const result = await this.dkgRequestModel.aggregate([
            { $match: { committeeId: committeeId } },
            {
                $lookup: {
                    from: 'dkgresponses',
                    as: 'responses',
                    localField: 'requestId',
                    foreignField: 'requestId',
                    pipeline: [
                        { $match: { active: true } },
                        { $sort: { memberId: 1 } },
                        { $project: { memberId: 1, contribution: 1 } },
                    ],
                },
            },
        ]);
        return result;
    }
}
