import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { fetchLastBlock } from 'o1js';
import { QueryService } from '../query/query.service';
import { CommitteeContractService } from '../committee-contract/committee-contract.service';
import { DkgContractsService } from '../dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from '../dkg-usage-contracts/dkg-usage-contracts.service';

@Injectable()
export class CronTasksService {
    private readonly logger = new Logger(CronTasksService.name);

    constructor(
        private readonly queryService: QueryService,
        private readonly committeeContractsService: CommitteeContractService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
    ) {}

    // 3 minutes
    @Interval(180000)
    async handleUpdateContracts(): Promise<void> {
        // await fetchLastBlock();
        await this.committeeContractsService.update();
        await this.dkgContractsService.update();
        await this.dkgUsageContractsService.update();
    }
}
