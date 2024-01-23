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

    @Process('updateContractMerkleTrees')
    async updateContractTrees(job: Job<unknown>) {
        try {
            Promise.all([
                this.committeeContractService.updateMerkleTrees(),
                this.dkgContractsService.updateMerkleTrees(),
                this.dkgUsageContractsService.updateMerkleTrees(),
                this.campaignContractService.updateMerkleTrees(),
                this.participationContractService.updateMerkleTrees(),
                this.projectContractService.updateMerkleTrees(),
                this.fundingContractService.updateMerkleTrees(),
            ]).then(async () => {
                this.logger.log(
                    'All contract trees updates completed successfully',
                );
                await job.progress();
                return {};
            });
        } catch (err) {
            this.logger.error(
                'Error during contract merkle tree updates: ',
                err,
            );
        }
    }

    @Process('rollupContracts')
    async rollupContracts(job: Job<unknown>) {
        try {
            Promise.all([
                this.committeeContractService.update(),
                this.dkgContractsService.update(),
                this.dkgUsageContractsService.update(),
                this.campaignContractService.update(),
                this.participationContractService.update(),
                this.projectContractService.update(),
                this.fundingContractService.update(),
                this.committeeContractService.compile(),
            ]).then(async () => {
                await this.committeeContractService.rollup();
                this.logger.log('All contract rollups completed successfully');
                await job.progress();
                return {};
            });
        } catch (err) {
            this.logger.error('Error during contract rollups: ', err);
            return undefined;
        }
    }
}
