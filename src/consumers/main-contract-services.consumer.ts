import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CommitteeContractService } from '../mina-contracts/committee-contract/committee-contract.service';
import { Logger } from '@nestjs/common';
import { DkgContractsService } from '../mina-contracts/dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from '../mina-contracts/dkg-usage-contracts/dkg-usage-contracts.service';
import { CampaignContractService } from '../mina-contracts/campaign-contract/campaign-contract.service';
import { ParticipationContractService } from '../mina-contracts/participation-contract/participation-contract.service';
import { ProjectContractService } from '../mina-contracts/project-contract/project-contract.service';
import { FundingContractService } from '../mina-contracts/funding-contract/funding-contract.service';
import { TreasuryManagerContractService } from 'src/mina-contracts/treasury-manager-contract/treasury-manager-contract.service';
import { RequesterContractsService } from 'src/mina-contracts/requester-contract/requester-contract.service';
import { RollupContractService } from 'src/mina-contracts/rollup-contract/rollup-contract.service';

@Processor('main-contract-services')
export class MainContractServicesConsumer {
    private readonly logger = new Logger(MainContractServicesConsumer.name);
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly requesterContractsService: RequesterContractsService,
        private readonly rollupContractService: RollupContractService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly projectContractService: ProjectContractService,
        private readonly fundingContractService: FundingContractService,
        private readonly treasuryManagerContractService: TreasuryManagerContractService,
    ) {}

    @Process('updateContractMerkleTrees')
    async updateContractTrees(job: Job<unknown>) {
        try {
            await this.rollupContractService.updateMerkleTrees();
            await this.committeeContractService.updateMerkleTrees();
            await this.dkgContractsService.updateMerkleTrees();
            await this.requesterContractsService.updateMerkleTrees();
            await this.dkgUsageContractsService.updateMerkleTrees();
            this.logger.log("All contracts' Merkle trees updated successfully");
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
            await this.rollupContractService.update();
            await this.committeeContractService.update();
            await this.dkgContractsService.update();
            await this.requesterContractsService.update();
            await this.dkgUsageContractsService.update();
            this.logger.log('All contracts updated successfully');
        } catch (err) {
            this.logger.error('Error during updating contracts: ', err);
            return undefined;
        }
    }
}
