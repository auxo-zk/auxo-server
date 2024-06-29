import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
    ReducerDependencies,
    ReducerJob,
    ReducerJobEnum,
    ReducerPriorities,
} from 'src/constants';
import { CampaignContractService } from 'src/mina-contracts/campaign-contract/campaign-contract.service';
import { ParticipationContractService } from 'src/mina-contracts/participation-contract/participation-contract.service';
import { ProjectContractService } from 'src/mina-contracts/project-contract/project-contract.service';
import { FundingContractService } from 'src/mina-contracts/funding-contract/funding-contract.service';
import { TreasuryManagerContractService } from 'src/mina-contracts/treasury-manager-contract/treasury-manager-contract.service';
import { NullifierContractService } from 'src/mina-contracts/nullifier-contract/nullifier-contract.service';

@Injectable()
export class BoiContractCronTasksService implements OnModuleInit {
    private readonly logger = new Logger(BoiContractCronTasksService.name);

    constructor(
        @InjectQueue('boi-contract-services')
        private readonly contractServices: Queue,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly projectContractService: ProjectContractService,
        private readonly fundingContractService: FundingContractService,
        private readonly treasuryManagerContractService: TreasuryManagerContractService,
        private readonly nullifierContractService: NullifierContractService,
    ) {}

    async onModuleInit() {
        await this.contractServices.client.flushdb();
        await this.contractServices.add(
            'handleContractServices',
            {
                type: ReducerJobEnum.COMPILE,
                date: Date.now(),
            },
            { priority: ReducerPriorities.get(ReducerJobEnum.COMPILE) },
        );
        this.logger.log('Queued Compile job at ' + process.pid);
    }

    @Cron('*/3 * * * *')
    async queueReducerJob() {
        this.logger.log('Querying next reducer jobs...');
        const [
            rollupProjectJobId,
            rollupCampaignJobId,
            rollupParticipationJobId,
            rollupFundingJobId,
            rollupTreasuryManagerJobId,
            rollupNullifierJobId,
        ] = await Promise.all([
            this.projectContractService.getNextRollupJob(),
            this.campaignContractService.getNextRollupJob(),
            this.participationContractService.getNextRollupJob(),
            this.fundingContractService.getNextRollupJob(),
            this.treasuryManagerContractService.getNextRollupJob(),
            this.nullifierContractService.getNextRollupJob(),
        ]);
        const queuedJobs = await this.contractServices.getJobs([
            'active',
            'waiting',
            'delayed',
            'paused',
            'delayed',
        ]);
        const jobCounters: Map<ReducerJobEnum, number> = new Map([]);
        for (const job of queuedJobs) {
            const jobId = job.id as string;
            const type = jobId.includes('-') ? Number(jobId.split('-')[0]) : -1;
            if (type == -1) continue;
            this.updateJobCounters(type, jobCounters);
        }
        this.logger.log('Querying done!');
        const jobCounts = await this.contractServices.getJobCounts();
        this.logger.log(
            'Queue status:' +
                Object.entries(jobCounts)
                    .map(([key, value]) => `\n- ${key}: ${value}`)
                    .join(),
        );
        let newJobCounter = 0;
        if (rollupProjectJobId) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.ROLLUP_PROJECT,
                jobCounters,
            );
            if (!isBlocked) {
                const rollupJob = this.getReducerJob(
                    ReducerJobEnum.ROLLUP_PROJECT,
                    rollupProjectJobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    rollupJob.data,
                    rollupJob.options,
                );
                newJobCounter++;
                this.updateJobCounters(
                    ReducerJobEnum.ROLLUP_PROJECT,
                    jobCounters,
                );
                this.logger.log(
                    'Queued Rollup Project job: ' + rollupProjectJobId,
                );
            }
        }
        if (rollupCampaignJobId) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.ROLLUP_CAMPAIGN,
                jobCounters,
            );
            if (!isBlocked) {
                const rollupJob = this.getReducerJob(
                    ReducerJobEnum.ROLLUP_CAMPAIGN,
                    rollupCampaignJobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    rollupJob.data,
                    rollupJob.options,
                );
                newJobCounter++;
                this.updateJobCounters(
                    ReducerJobEnum.ROLLUP_CAMPAIGN,
                    jobCounters,
                );
                this.logger.log(
                    'Queued Rollup Campaign job: ' + rollupCampaignJobId,
                );
            }
        }
        if (rollupParticipationJobId) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.ROLLUP_PARTICIPATION,
                jobCounters,
            );
            if (!isBlocked) {
                const rollupJob = this.getReducerJob(
                    ReducerJobEnum.ROLLUP_PARTICIPATION,
                    rollupParticipationJobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    rollupJob.data,
                    rollupJob.options,
                );
                newJobCounter++;
                this.updateJobCounters(
                    ReducerJobEnum.ROLLUP_PARTICIPATION,
                    jobCounters,
                );
                this.logger.log(
                    'Queued Rollup Participation job: ' +
                        rollupParticipationJobId,
                );
            }
        }
        if (rollupFundingJobId) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.ROLLUP_FUNDING,
                jobCounters,
            );
            if (!isBlocked) {
                const rollupJob = this.getReducerJob(
                    ReducerJobEnum.ROLLUP_FUNDING,
                    rollupFundingJobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    rollupJob.data,
                    rollupJob.options,
                );
                newJobCounter++;
                this.updateJobCounters(ReducerJobEnum.ROLLUP, jobCounters);
                this.logger.log(
                    'Queued Rollup Funding job: ' + rollupFundingJobId,
                );
            }
        }
        if (rollupTreasuryManagerJobId) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.ROLLUP_TREASURY_MANAGER,
                jobCounters,
            );
            if (!isBlocked) {
                const rollupJob = this.getReducerJob(
                    ReducerJobEnum.ROLLUP_TREASURY_MANAGER,
                    rollupTreasuryManagerJobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    rollupJob.data,
                    rollupJob.options,
                );
                newJobCounter++;
                this.updateJobCounters(
                    ReducerJobEnum.ROLLUP_TREASURY_MANAGER,
                    jobCounters,
                );
                this.logger.log(
                    'Queued Rollup Treasury Manager job: ' +
                        rollupTreasuryManagerJobId,
                );
            }
        }
        // if (rollupNullifierJobId) {
        //     const isBlocked = this.isJobBlocked(
        //         ReducerJobEnum.ROLLUP_NULLIFIER,
        //         jobCounters,
        //     );
        //     if (!isBlocked) {
        //         const rollupJob = this.getReducerJob(
        //             ReducerJobEnum.ROLLUP_NULLIFIER,
        //             rollupNullifierJobId,
        //         );
        //         await this.contractServices.add(
        //             'handleContractServices',
        //             rollupJob.data,
        //             rollupJob.options,
        //         );
        //         newJobCounter++;
        //         this.updateJobCounters(
        //             ReducerJobEnum.ROLLUP_NULLIFIER,
        //             jobCounters,
        //         );
        //         this.logger.log(
        //             'Queued Rollup Nullifier job: ' + rollupNullifierJobId,
        //         );
        //     }
        // }
    }

    isJobBlocked(
        jobType: ReducerJobEnum,
        jobCounters: Map<ReducerJobEnum, number>,
    ) {
        if (ReducerDependencies.get(jobType)) {
            for (const dependency of ReducerDependencies.get(jobType)) {
                if (
                    jobCounters.has(dependency) &&
                    jobCounters[dependency] > 0
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    getReducerJob(
        jobType: ReducerJobEnum,
        uniqueId: string,
        customPriority?: number,
    ): ReducerJob {
        return {
            options: {
                jobId: `${jobType}-${uniqueId}`,
                priority: customPriority || ReducerPriorities.get(jobType),
                removeOnFail: true,
            },
            data: {
                type: jobType,
                date: Date.now(),
            },
        };
    }

    updateJobCounters(
        jobType: ReducerJobEnum,
        jobCounters: Map<ReducerJobEnum, number>,
    ) {
        if (jobCounters.has(jobType)) {
            jobCounters.set(jobType, jobCounters.get(jobType) + 1);
        } else {
            jobCounters.set(jobType, 1);
        }
    }
}
