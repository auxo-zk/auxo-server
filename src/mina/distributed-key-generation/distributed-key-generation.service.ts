import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';

@Injectable()
export class DistributedKeyGenerationService implements OnModuleInit {
    constructor(private readonly queryService: QueryService) {}

    async onModuleInit() {}

    async getZkAppState() {}
}
