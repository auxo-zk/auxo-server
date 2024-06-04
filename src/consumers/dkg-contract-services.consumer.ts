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
import { RollupContractService } from 'src/mina-contracts/rollup-contract/rollup-contract.service';
import { RequesterContractsService } from 'src/mina-contracts/requester-contract/requester-contract.service';

@Processor('dkg-contract-services')
export class DkgContractServicesConsumer {
    private readonly logger = new Logger(DkgContractServicesConsumer.name);
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly rollupContractService: RollupContractService,
        private readonly requesterContractsService: RequesterContractsService,
        // private readonly campaignContractService: CampaignContractService,
        // private readonly participationContractService: ParticipationContractService,
        // private readonly projectContractService: ProjectContractService,
        // private readonly fundingContractService: FundingContractService,
        // private readonly treasuryManagerContractService: TreasuryManagerContractService,
    ) {}

    @Process({ name: 'handleContractServices', concurrency: 1 })
    async handleContractServices(job: Job<{ type: number; date: Date }>) {
        try {
            switch (job.data.type) {
                case 0:
                    try {
                        this.logger.log('Start compiling contract...');
                        await this.rollupContractService.compile();
                        await this.committeeContractService.compile();
                        await this.dkgContractsService.compile();
                        await this.dkgUsageContractsService.compile();
                        await this.requesterContractsService.compile();
                        this.logger.log('All contracts compiled successfully');
                        await job.progress();
                    } catch (err) {
                        this.logger.error(
                            'Error during compiling contracts: ',
                            err,
                        );
                    }
                    break;
                case 1:
                    try {
                        this.logger.log('Start rolluping 1st...');
                        this.rollupContractService.update().then(() => {
                            Promise.all([
                                this.committeeContractService.update(),
                                this.dkgContractsService.update(),
                                this.dkgUsageContractsService.update(),
                                this.requesterContractsService.update(),
                            ]).then(async () => {
                                await this.requesterContractsService.rollup();
                                const result = [];
                                let tmp: boolean;
                                tmp =
                                    await this.committeeContractService.rollup();
                                result.push(tmp);
                                tmp = await this.rollupContractService.rollup();
                                result.push(tmp);
                                if (!result.includes(true)) {
                                    await this.dkgUsageContractsService.rollupResponse();
                                    await this.dkgContractsService.rollupRound2();
                                    await this.dkgContractsService.rollupRound1();
                                    await this.dkgContractsService.rollupDkg();
                                }
                                tmp =
                                    await this.dkgUsageContractsService.rollupRequest();
                                if (tmp == false) {
                                    await this.dkgUsageContractsService.computeResult();
                                }
                                await job.progress();
                                this.logger.log(
                                    'All contract rolluped successfully',
                                );
                            });
                        });
                    } catch (err) {
                        this.logger.error(
                            'Error during rolluping contracts: ',
                            err,
                        );
                    }
                    break;
                case 2:
                    try {
                        this.logger.log('Start rolluping 2nd...');
                        this.rollupContractService.update().then(() => {
                            Promise.all([
                                this.committeeContractService.update(),
                                this.dkgContractsService.update(),
                                this.dkgUsageContractsService.update(),
                                this.requesterContractsService.update(),
                            ]).then(async () => {
                                await this.requesterContractsService.rollup();
                                const result = [];
                                let tmp: boolean;
                                tmp =
                                    await this.dkgUsageContractsService.rollupResponse();
                                result.push(tmp);
                                tmp =
                                    await this.dkgContractsService.rollupRound2();
                                result.push(tmp);
                                tmp =
                                    await this.dkgContractsService.rollupRound1();
                                result.push(tmp);
                                tmp =
                                    await this.dkgContractsService.rollupDkg();
                                result.push(tmp);

                                if (!result.includes(true)) {
                                    await this.committeeContractService.rollup();
                                    await this.rollupContractService.rollup();
                                }
                                tmp =
                                    await this.dkgUsageContractsService.computeResult();
                                if (tmp == false) {
                                    await this.dkgUsageContractsService.rollupRequest();
                                }
                                await job.progress();
                                this.logger.log(
                                    'All contract rolluped successfully',
                                );
                            });
                        });
                    } catch (err) {
                        this.logger.error(
                            'Error during rolluping contracts: ',
                            err,
                        );
                    }
                    break;
            }
        } catch (err) {
            console.log(err);
        }
    }
}
