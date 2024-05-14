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
        return await this.dkgRequestModel.find(
            {},
            {},
            { sort: { requestId: 1 } },
        );
    }

    async getRequest(requestId: number): Promise<DkgRequest> {
        const exist = await this.dkgRequestModel.exists({
            requestId: requestId,
        });
        if (exist) {
            return await this.dkgRequestModel.findOne({ requestId: requestId });
        } else {
            throw new NotFoundException();
        }
    }
}
