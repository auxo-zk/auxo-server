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
import { ReducerJobData, ReducerJobEnum } from 'src/constants';
import { NullifierContractService } from 'src/mina-contracts/nullifier-contract/nullifier-contract.service';

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
        private readonly nullifierContractService: NullifierContractService,
    ) {}

    @Process({ name: 'handleContractServices', concurrency: 1 })
    async handleContractServices(job: Job<ReducerJobData>) {
        try {
            const jobId = job.id as string;
            console.log('Job ID:', jobId);
            let isSuccessful = false;
            switch (job.data.type) {
                case ReducerJobEnum.COMPILE:
                    this.logger.log('Start compile job...');
                    await this.projectContractService.compile();
                    await this.campaignContractService.compile();
                    await this.participationContractService.compile();
                    await this.participationContractService.compile();
                    await this.fundingContractService.compile();
                    await this.treasuryManagerContractService.compile();
                    await this.nullifierContractService.compile();
                    isSuccessful = true;
                    break;
                case ReducerJobEnum.ROLLUP_PROJECT:
                    this.logger.log('Start rollup project job...');
                    isSuccessful =
                        await this.projectContractService.processRollupJob(
                            jobId.slice(jobId.indexOf('-') + 1),
                        );
                    break;
                case ReducerJobEnum.ROLLUP_CAMPAIGN:
                    this.logger.log('Start rollup campaign job...');
                    isSuccessful =
                        await this.campaignContractService.processRollupJob(
                            jobId.slice(jobId.indexOf('-') + 1),
                        );
                    break;
                case ReducerJobEnum.ROLLUP_PARTICIPATION:
                    this.logger.log('Start rollup participation job...');
                    isSuccessful =
                        await this.participationContractService.processRollupJob(
                            jobId.slice(jobId.indexOf('-') + 1),
                        );
                    break;
                case ReducerJobEnum.ROLLUP_FUNDING:
                    this.logger.log('Start rollup funding job...');
                    isSuccessful =
                        await this.fundingContractService.processRollupJob(
                            jobId.slice(jobId.indexOf('-') + 1),
                        );
                    break;
                case ReducerJobEnum.ROLLUP_TREASURY_MANAGER:
                    this.logger.log('Start rollup treasury manager job...');
                    isSuccessful =
                        await this.treasuryManagerContractService.processRollupJob(
                            jobId.slice(jobId.indexOf('-') + 1),
                        );
                    break;
                case ReducerJobEnum.ROLLUP_NULLIFIER:
                    this.logger.log('Start rollup nullifier job...');
                    isSuccessful =
                        await this.nullifierContractService.processRollupJob(
                            jobId.slice(jobId.indexOf('-') + 1),
                        );
                    break;
            }
            if (!isSuccessful) {
                throw new Error();
            }
            // await job.moveToCompleted(undefined, true);
            this.logger.log(`Job ${jobId} processed!`);
        } catch (err) {
            console.log(err);
        } finally {
        }
    }
}
