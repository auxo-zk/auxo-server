import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CommitteeContractService } from '../committee-contract/committee-contract.service';
import { Logger } from '@nestjs/common';
import { DkgContractsService } from '../dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from '../dkg-usage-contracts/dkg-usage-contracts.service';
import { CampaignContractService } from '../campaign-contract/campaign-contract.service';
import { ParticipationContractService } from '../participation-contract/participation-contract.service';
import { ProjectContractService } from '../project-contract/project-contract.service';
import { FundingContractService } from '../funding-contract/funding-contract.service';

@Processor('fetch-actions')
export class FetchActionsConsumer {
    private readonly logger = new Logger('FetchActionsConsumer');
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly projectContractService: ProjectContractService,
        private readonly fundingContractService: FundingContractService,
    ) {}

    @Process('handle')
    async handle(job: Job<unknown>) {
        this.logger.log('Fetching actions');
        await this.committeeContractService.update();
        await this.dkgContractsService.update();
        await this.dkgUsageContractsService.update();
        await this.campaignContractService.update();
        await this.participationContractService.update();
        await this.projectContractService.update();
        await this.fundingContractService.update();
        await job.progress();
        this.logger.log('Fetch DONE');
        return {};
    }
}
