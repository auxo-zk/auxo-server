import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DkgRequest } from 'src/schemas/request.schema';

@Injectable()
export class RequestsService {
    constructor(
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
    ) {}

    async getRequests(): Promise<DkgRequest[]> {
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
