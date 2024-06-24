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
import { ReducerJobData, ReducerJobEnum } from 'src/constants';

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
    async handleContractServices(job: Job<ReducerJobData>) {
        try {
            const jobId = job.id as string;
            console.log('Job ID:', jobId);
            let isSuccessful = false;
            switch (job.data.type) {
                case ReducerJobEnum.COMPILE:
                    this.logger.log('Start compile job...');
                    await this.rollupContractService.compile();
                    await this.committeeContractService.compile();
                    await this.dkgContractsService.compile();
                    await this.dkgUsageContractsService.compile();
                    await this.requesterContractsService.compile();
                    isSuccessful = true;
                    break;
                case ReducerJobEnum.ROLLUP:
                    this.logger.log('Start rollup job...');
                    isSuccessful =
                        await this.rollupContractService.processRollupJob(
                            jobId.slice(2),
                        );
                    break;
                case ReducerJobEnum.UPDATE_COMMITTEE:
                    this.logger.log('Start update committee job...');
                    isSuccessful =
                        await this.committeeContractService.processUpdateCommitteeJob(
                            jobId.slice(2),
                        );
                    break;
                case ReducerJobEnum.UPDATE_KEY:
                    this.logger.log('Start update key job...');
                    isSuccessful =
                        await this.dkgContractsService.processUpdateKeyJob(
                            jobId.slice(2),
                        );
                    break;
                case ReducerJobEnum.FINALIZE_ROUND_1:
                    this.logger.log('Start finalize round 1 job...');
                    await this.dkgContractsService.processFinalizeRound1Job(
                        jobId.slice(2),
                    );
                    break;
                case ReducerJobEnum.FINALIZE_ROUND_2:
                    this.logger.log('Start finalize round 2 job...');
                    isSuccessful =
                        await this.dkgContractsService.processFinalizeRound2Job(
                            jobId.slice(2),
                        );
                    break;
                case ReducerJobEnum.UPDATE_TASK:
                    this.logger.log('Start update task job...');
                    isSuccessful =
                        await this.requesterContractsService.processUpdateTaskJob(
                            jobId.slice(2),
                        );
                    break;
                case ReducerJobEnum.UPDATE_REQUEST:
                    this.logger.log('Start update request job...');
                    isSuccessful =
                        await this.dkgUsageContractsService.processUpdateRequestJob(
                            jobId.slice(2),
                        );
                    break;
                case ReducerJobEnum.FINALIZE_RESPONSE:
                    this.logger.log('Start finalize response job...');
                    isSuccessful =
                        await this.dkgUsageContractsService.processFinalizeResponseJob(
                            jobId.slice(2),
                        );
                    break;
                case ReducerJobEnum.RESOLVE:
                    this.logger.log('Start resolve job...');
                    isSuccessful =
                        await this.dkgUsageContractsService.processResolveJob(
                            jobId.slice(2),
                        );
                    break;
            }
            if (!isSuccessful) {
                throw new Error();
            }
            // await job.moveToCompleted(undefined, true);
            this.logger.log(`Job ${jobId} processed!`);
        } catch (error) {
            this.logger.error(`Failed to process job ${job.id}`, error);
            throw error;
        }
    }
}
