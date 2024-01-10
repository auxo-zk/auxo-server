import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';

@Injectable()
export class CampaignContractService implements OnModuleInit {
    constructor(private readonly queryService: QueryService) {}

    async onModuleInit() {}
}
