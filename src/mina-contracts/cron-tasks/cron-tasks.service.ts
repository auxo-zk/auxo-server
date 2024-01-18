import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { fetchLastBlock } from 'o1js';
import { QueryService } from '../query/query.service';
import { CommitteeContractService } from '../committee-contract/committee-contract.service';
import { DkgContractsService } from '../dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from '../dkg-usage-contracts/dkg-usage-contracts.service';
import { CampaignContractService } from '../campaign-contract/campaign-contract.service';
import { ParticipationContractService } from '../participation-contract/participation-contract.service';
import { FundingContractService } from '../funding-contract/funding-contract.service';
import { ProjectContractService } from '../project-contract/project-contract.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class CronTasksService {
    private readonly logger = new Logger(CronTasksService.name);

    constructor(
        @InjectQueue('contract-services')
        private readonly contractServices: Queue,
        private readonly queryService: QueryService,
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly projectContractService: ProjectContractService,
        private readonly fundingContractService: FundingContractService,
    ) {}

    // 3 minutes
    @Interval(180000)
    async handleUpdateContracts(): Promise<void> {
        await this.contractServices.add('updateContracts', {
            date: Date.now(),
        });
    }

    // @Interval(20000)
    // async handleRollupContracts(): Promise<void> {
    //     await this.committeeContractService.compile();
    //     // await this.contractServices.add('rollupContracts', {
    //     //     date: Date.now(),
    //     // });
    // }
}
