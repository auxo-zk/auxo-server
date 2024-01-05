import { Injectable } from '@nestjs/common';
import { QueryService } from '../query/query.service';

@Injectable()
export class ProjectContractService {
    constructor(private readonly queryService: QueryService) {}

    async fetch() {
        await this.fetchProjectActions();
    }

    private async fetchProjectActions() {}

    private async updateProjects() {}
}
