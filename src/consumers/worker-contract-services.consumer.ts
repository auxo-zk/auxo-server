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

@Processor('worker-contract-services')
export class WorkerContractServicesConsumer {
    private readonly logger = new Logger(WorkerContractServicesConsumer.name);
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
                this.logger.log('All contract trees updated successfully');
                await job.progress();
                return {};
            });
        } catch (err) {
            this.logger.error('Error during updating contract trees: ', err);
            return undefined;
        }
    }

    @Process('updateContracts')
    async updateContracts(job: Job<unknown>) {
        try {
            Promise.all([
                this.committeeContractService.update(),
                this.dkgContractsService.update(),
                this.dkgUsageContractsService.update(),
                this.campaignContractService.update(),
                this.participationContractService.update(),
                this.projectContractService.update(),
                this.fundingContractService.update(),
            ]).then(async () => {
                this.logger.log('All contracts updated successfully');
                await job.progress();
                return {};
            });
        } catch (err) {
            this.logger.error('Error during updating contracts: ', err);
            return undefined;
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
            ]).then(async () => {
                await this.committeeContractService.rollup();
                this.logger.log('All contract rolluped successfully');
                await job.progress();
                return {};
            });
        } catch (err) {
            this.logger.error('Error during rolluping contracts: ', err);
            return undefined;
        }
    }

    @Process('compileContracts')
    async compileContracts(job: Job<unknown>) {
        try {
            Promise.all([
                this.committeeContractService.compile(),
                this.dkgContractsService.compile(),
            ]).then(async () => {
                this.logger.log('All contracts compiled successfully');
                await job.progress();
                return {};
            });
        } catch (err) {
            this.logger.error('Error during compiling contracts: ', err);
            return undefined;
        }
    }
}
