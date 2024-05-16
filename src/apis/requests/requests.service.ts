import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GetRequestsDto } from 'src/dtos/get-requests.dto';
import { Key } from 'src/schemas/key.schema';
import { DkgRequest } from 'src/schemas/request.schema';

@Injectable()
export class RequestsService {
    constructor(
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
    ) {}

    async getRequests(getRequestsDto: GetRequestsDto): Promise<DkgRequest[]> {
        try {
            if (
                getRequestsDto.committeeId != undefined &&
                getRequestsDto.keyIndex != undefined
            ) {
                throw new BadRequestException();
            } else if (getRequestsDto.committeeId != undefined) {
                const keys = await this.keyModel.find({
                    committeeId: getRequestsDto.committeeId,
                });
                const keyIndexes = keys.map((key) => Number(key.keyIndex));
                return await this.dkgRequestModel.aggregate([
                    {
                        $match: {
                            keyIndex: { $in: keyIndexes },
                        },
                    },
                    {
                        $lookup: {
                            from: 'tasks',
                            as: 'task',
                            foreignField: 'task',
                            localField: 'task',
                        },
                    },
                    {
                        $unwind: {
                            path: '$task',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                    {
                        $lookup: {
                            from: 'keys',
                            as: 'key',
                            localField: 'keyIndex',
                            foreignField: 'keyIndex',
                        },
                    },
                    {
                        $unwind: {
                            path: '$key',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                ]);
            } else if (getRequestsDto.keyIndex != undefined) {
                return await this.dkgRequestModel.aggregate([
                    {
                        $match: {
                            keyIndex: Number(getRequestsDto.keyIndex),
                        },
                    },
                    {
                        $lookup: {
                            from: 'tasks',
                            as: 'task',
                            foreignField: 'task',
                            localField: 'task',
                        },
                    },
                    {
                        $unwind: {
                            path: '$task',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                    {
                        $lookup: {
                            from: 'keys',
                            as: 'key',
                            localField: 'keyIndex',
                            foreignField: 'keyIndex',
                        },
                    },
                    {
                        $unwind: {
                            path: '$key',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                ]);
            } else {
                return await this.dkgRequestModel.aggregate([
                    {
                        $lookup: {
                            from: 'tasks',
                            as: 'task',
                            foreignField: 'task',
                            localField: 'task',
                        },
                    },
                    {
                        $unwind: {
                            path: '$task',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                    {
                        $lookup: {
                            from: 'keys',
                            as: 'key',
                            localField: 'keyIndex',
                            foreignField: 'keyIndex',
                        },
                    },
                    {
                        $unwind: {
                            path: '$key',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                ]);
            }
        } catch (err) {
            throw new BadRequestException();
        }
    }

    async getRequest(requestId: number): Promise<DkgRequest> {
        const result = await this.dkgRequestModel.aggregate([
            {
                $match: {
                    requestId: requestId,
                },
            },
            {
                $lookup: {
                    from: 'tasks',
                    as: 'task',
                    foreignField: 'task',
                    localField: 'task',
                },
            },
            {
                $unwind: {
                    path: '$task',
                    preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                },
            },
            {
                $lookup: {
                    from: 'keys',
                    as: 'key',
                    localField: 'keyIndex',
                    foreignField: 'keyIndex',
                },
            },
            {
                $unwind: {
                    path: '$key',
                    preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                },
            },
        ]);
        if (result.length > 0) {
            return result[0];
        } else {
            throw new NotFoundException();
        }
    }
}
