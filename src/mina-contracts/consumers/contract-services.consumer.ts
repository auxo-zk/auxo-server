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

@Processor('contract-services')
export class ContractServicesConsumer {
    private readonly logger = new Logger('ContractServicesConsumer');
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly projectContractService: ProjectContractService,
        private readonly fundingContractService: FundingContractService,
    ) {}

    @Process('updateContracts')
    async updateContracts(job: Job<unknown>) {
        try {
            this.logger.log('Starting contract updates');
            await this.committeeContractService.update();
            await this.dkgContractsService.update();
            await this.dkgUsageContractsService.update();
            await this.campaignContractService.update();
            await this.participationContractService.update();
            await this.projectContractService.update();
            await this.fundingContractService.update();
            await job.progress();
            this.logger.log('All contract updates completed successfully');
            return {};
        } catch (err) {
            this.logger.error('Error during contract updates: ', err);
        }
    }

    @Process('rollupContracts')
    async rollupContracts(job: Job<unknown>) {
        try {
            this.logger.log('Starting contract rollups');
            await this.committeeContractService.compile();
            await this.committeeContractService.compile();
            this.logger.log('All contract rollups completed successfully');
            await job.progress();
            return {};
        } catch (err) {
            this.logger.error('Error during contract rollups: ', err);
            return undefined;
        }
    }
}
