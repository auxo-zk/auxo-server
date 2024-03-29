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
import { TreasuryContractService } from 'src/mina-contracts/treasury-contract/treasury-contract.service';

@Processor('dkg-contract-services')
export class DkgContractServicesConsumer {
    private readonly logger = new Logger(DkgContractServicesConsumer.name);
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly projectContractService: ProjectContractService,
        private readonly fundingContractService: FundingContractService,
        private readonly treasuryContractService: TreasuryContractService,
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
                this.treasuryContractService.updateMerkleTrees(),
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
                this.treasuryContractService.update(),
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

    @Process('rollupContractsFirstOrder')
    async rollupContractsFirstOrder(job: Job<unknown>) {
        try {
            Promise.all([
                this.committeeContractService.update(),
                this.dkgContractsService.update(),
                this.dkgUsageContractsService.update(),
            ]).then(async () => {
                const runs = [
                    await this.committeeContractService.rollup(),
                    await this.dkgContractsService.rollupDkg(),
                    await this.dkgContractsService.reduceRound1(),
                    await this.dkgContractsService.reduceRound2(),
                    await this.dkgUsageContractsService.reduceDkgResponse(),
                    await this.dkgUsageContractsService.rollupDkgRequest(),
                ];
                if (!runs.includes(true)) {
                    const keysForRound1Finalization =
                        await this.dkgContractsService.getKeysReadyForRound1Finalization();
                    const keysForRound2Finalization =
                        await this.dkgContractsService.getKeysReadyForRound2Finalization();
                    const requestsForResponseCompletion =
                        await this.dkgUsageContractsService.getDkgRequestsReadyForResponseCompletion();

                    keysForRound1Finalization.length > 0
                        ? await this.dkgContractsService.finalizeRound1(
                              keysForRound1Finalization[0].committeeId,
                              keysForRound1Finalization[0].keyId,
                          )
                        : false;
                    keysForRound2Finalization.length > 0
                        ? await this.dkgContractsService.finalizeRound2(
                              keysForRound2Finalization[0].committeeId,
                              keysForRound2Finalization[0].keyId,
                          )
                        : false;
                    requestsForResponseCompletion.length > 0
                        ? await this.dkgUsageContractsService.completeResponse(
                              requestsForResponseCompletion[0].requestId,
                          )
                        : false;
                }
                await job.progress();
                this.logger.log('All contract rolluped successfully');
                return {};
            });
        } catch (err) {
            this.logger.error('Error during rolluping contracts: ', err);
            return undefined;
        }
    }
    @Process('rollupContractsSecondOrder')
    async rollupContractsSecondOrder(job: Job<unknown>) {
        try {
            Promise.all([
                this.committeeContractService.update(),
                this.dkgContractsService.update(),
                this.dkgUsageContractsService.update(),
            ]).then(async () => {
                const keysForRound1Finalization =
                    await this.dkgContractsService.getKeysReadyForRound1Finalization();
                const keysForRound2Finalization =
                    await this.dkgContractsService.getKeysReadyForRound2Finalization();
                const requestsForResponseCompletion =
                    await this.dkgUsageContractsService.getDkgRequestsReadyForResponseCompletion();
                const runs = [
                    keysForRound1Finalization.length > 0
                        ? await this.dkgContractsService.finalizeRound1(
                              keysForRound1Finalization[0].committeeId,
                              keysForRound1Finalization[0].keyId,
                          )
                        : false,
                    keysForRound2Finalization.length > 0
                        ? await this.dkgContractsService.finalizeRound2(
                              keysForRound2Finalization[0].committeeId,
                              keysForRound2Finalization[0].keyId,
                          )
                        : false,
                    requestsForResponseCompletion.length > 0
                        ? await this.dkgUsageContractsService.completeResponse(
                              requestsForResponseCompletion[0].requestId,
                          )
                        : false,
                ];
                if (!runs.includes(true)) {
                    await this.committeeContractService.rollup();
                    await this.dkgContractsService.rollupDkg();
                    await this.dkgContractsService.reduceRound1();
                    await this.dkgContractsService.reduceRound2();
                    await this.dkgUsageContractsService.reduceDkgResponse();
                    await this.dkgUsageContractsService.rollupDkgRequest();
                }
                await job.progress();
                this.logger.log('All contract rolluped successfully');
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
                this.dkgUsageContractsService.compile(),
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
