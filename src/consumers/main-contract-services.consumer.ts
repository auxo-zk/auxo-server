import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CommitteeContractService } from '../mina-contracts/committee-contract/committee-contract.service';
import { Logger } from '@nestjs/common';
import { DkgContractsService } from '../mina-contracts/dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from '../mina-contracts/dkg-usage-contracts/dkg-usage-contracts.service';
// import { CampaignContractService } from '../mina-contracts/campaign-contract/campaign-contract.service';
// import { ParticipationContractService } from '../mina-contracts/participation-contract/participation-contract.service';
// import { ProjectContractService } from '../mina-contracts/project-contract/project-contract.service';
// import { FundingContractService } from '../mina-contracts/funding-contract/funding-contract.service';
// import { TreasuryManagerContractService } from 'src/mina-contracts/treasury-manager-contract/treasury-manager-contract.service';
import { RollupContractService } from 'src/mina-contracts/rollup-contract/rollup-contract.service';
import { RequesterContractsService } from 'src/mina-contracts/requester-contract/requester-contract.service';

@Processor('main-contract-services')
export class MainContractServicesConsumer {
    private readonly logger = new Logger(MainContractServicesConsumer.name);
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly requesterContractsService: RequesterContractsService,
        private readonly rollupContractService: RollupContractService,
        // private readonly campaignContractService: CampaignContractService,
        // private readonly participationContractService: ParticipationContractService,
        // private readonly projectContractService: ProjectContractService,
        // private readonly fundingContractService: FundingContractService,
        // private readonly treasuryManagerContractService: TreasuryManagerContractService,
    ) {}

    @Process('updateContractMerkleTrees')
    async updateContractTrees(job: Job<unknown>) {
        try {
            Promise.all([
                this.rollupContractService.updateMerkleTrees(),
                this.committeeContractService.updateMerkleTrees(),
                this.dkgContractsService.updateMerkleTrees(),
                this.dkgUsageContractsService.updateMerkleTrees(),
                this.requesterContractsService.updateMerkleTrees(),
            ]).then(async () => {
                this.logger.log('All contract trees updated successfully');
                await job.progress();
                return {};
            });
        } catch (err) {
            this.logger.error(
                'Error during updating contract merkle trees: ',
                err,
            );
            return undefined;
        }
    }

    @Process('updateContracts')
    async updateContracts(job: Job<unknown>) {
        try {
            this.rollupContractService.update().then(() => {
                Promise.all([
                    this.committeeContractService.update(),
                    this.dkgContractsService.update(),
                    this.dkgUsageContractsService.update(),
                    this.requesterContractsService.update(),
                ]).then(async () => {
                    this.logger.log('All contracts updated successfully');
                    await job.progress();
                    return {};
                });
            });
        } catch (err) {
            this.logger.error('Error during updating contracts: ', err);
            return undefined;
        }
    }
}
