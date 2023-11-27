import { Injectable } from '@nestjs/common';
import { QueryService } from '../query/query.service';

@Injectable()
export class DkgService {
    constructor(private readonly queryService: QueryService) {}

    async fetch() {}

    // ============ PRIVATE FUNCTIONS ============

    private async fetchAllActions() {
        await this.fetchAllDkgActions();
        await this.fetchAllRound1Actions();
        await this.fetchAllRound2Actions();
    }

    private async fetchAllDkgActions() {}

    private async fetchAllRound1Actions() {}

    private async fetchAllRound2Actions() {}

    private async updateKeys() {}
}
