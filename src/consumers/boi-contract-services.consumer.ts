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

@Processor('boi-contract-services')
export class BoiContractServicesConsumer {
    private readonly logger = new Logger(BoiContractServicesConsumer.name);
    constructor(
        private readonly committeeContractService: CommitteeContractService,
        private readonly dkgContractsService: DkgContractsService,
        private readonly dkgUsageContractsService: DkgUsageContractsService,
        private readonly requesterContractsService: RequesterContractsService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly projectContractService: ProjectContractService,
        private readonly fundingContractService: FundingContractService,
        private readonly treasuryManagerContractService: TreasuryManagerContractService,
    ) {}

    @Process({ name: 'handleContractServices', concurrency: 1 })
    async handleContractServices(job: Job<{ type: number; date: Date }>) {
        try {
            switch (job.data.type) {
                case 0:
                    try {
                        this.logger.log('Start compiling contract...');
                        await this.committeeContractService.compile();
                        await this.dkgContractsService.compile();
                        await this.dkgUsageContractsService.compile();
                        await this.requesterContractsService.compile();
                        await this.projectContractService.compile();
                        await this.campaignContractService.compile();
                        await this.participationContractService.compile();
                        await this.fundingContractService.compile();
                        await this.treasuryManagerContractService.compile();
                        this.logger.log('All contracts compiled successfully');
                        await job.progress();
                    } catch (err) {
                        this.logger.error(
                            'Error during compiling contracts: ',
                            err,
                        );
                    } finally {
                        break;
                    }
                case 1:
                    try {
                        this.logger.log('Start rolluping 1st...');
                        await this.committeeContractService.update();
                        await this.dkgContractsService.update();
                        await this.dkgUsageContractsService.update();
                        await this.requesterContractsService.update();
                        await this.projectContractService.update();
                        await this.campaignContractService.update();
                        await this.participationContractService.update();
                        await this.fundingContractService.update();
                        await this.treasuryManagerContractService.update();

                        await this.projectContractService.rollup();
                        await this.campaignContractService.rollup();
                        await this.fundingContractService.rollup();
                        await this.participationContractService.rollup();
                        await this.treasuryManagerContractService.rollup();

                        this.logger.log('All contract rolluped successfully');
                    } catch (err) {
                        this.logger.error(
                            'Error during rolluping contracts: ',
                            err,
                        );
                    } finally {
                        break;
                    }
                case 2:
                    try {
                        this.logger.log('Start rolluping 2nd...');
                        await this.committeeContractService.update();
                        await this.dkgContractsService.update();
                        await this.dkgUsageContractsService.update();
                        await this.requesterContractsService.update();
                        await this.projectContractService.update();
                        await this.campaignContractService.update();
                        await this.participationContractService.update();
                        await this.fundingContractService.update();
                        await this.treasuryManagerContractService.update();

                        await this.projectContractService.rollup();
                        await this.campaignContractService.rollup();
                        await this.fundingContractService.rollup();
                        await this.participationContractService.rollup();
                        await this.treasuryManagerContractService.rollup();

                        this.logger.log('All contract rolluped successfully');
                    } catch (err) {
                        this.logger.error(
                            'Error during rolluping contracts: ',
                            err,
                        );
                    } finally {
                        break;
                    }
            }
        } catch (err) {
            console.log(err);
        } finally {
        }
    }
}
