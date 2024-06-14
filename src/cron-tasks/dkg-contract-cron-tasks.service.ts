import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { RollupContractService } from 'src/mina-contracts/rollup-contract/rollup-contract.service';
import { CommitteeContractService } from 'src/mina-contracts/committee-contract/committee-contract.service';
import { DkgContractsService } from '../mina-contracts/dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from '../mina-contracts/dkg-usage-contracts/dkg-usage-contracts.service';
import { RequesterContractsService } from 'src/mina-contracts/requester-contract/requester-contract.service';
import { CampaignContractService } from '../mina-contracts/campaign-contract/campaign-contract.service';
import { ParticipationContractService } from '../mina-contracts/participation-contract/participation-contract.service';
import { ProjectContractService } from '../mina-contracts/project-contract/project-contract.service';
import { FundingContractService } from '../mina-contracts/funding-contract/funding-contract.service';
import { TreasuryManagerContractService } from 'src/mina-contracts/treasury-manager-contract/treasury-manager-contract.service';
import {
    ReducerDependencies,
    ReducerJob,
    ReducerJobEnum,
    ReducerPriorities,
} from 'src/constants';

@Injectable()
export class DkgContractCronTasksService implements OnModuleInit {
    private readonly logger = new Logger(DkgContractCronTasksService.name);

    constructor(
        @InjectQueue('dkg-contract-services')
        private readonly contractServices: Queue,
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

    @Cron('*/2 * * * *')
    async queueReducerJobs() {
        this.logger.log('Querying next reducer jobs...');
        const [
            rollupJobId,
            updateCommitteeJobId,
            updateKeyJobId,
            finalizeRound1JobIds,
            finalizeRound2JobIds,
            updateTaskJobIds,
            updateRequestJobId,
            finalizeResponseJobIds,
            resolveJobIds,
        ] = await Promise.all([
            this.rollupContractService.getNextRollupJob(),
            this.committeeContractService.getNextUpdateCommitteeJob(),
            this.dkgContractsService.getNextUpdateKeyJob(),
            this.dkgContractsService.getNextFinalizeRound1Jobs(),
            this.dkgContractsService.getNextFinalizeRound2Jobs(),
            this.requesterContractsService.getNextUpdateTaskJobs(),
            this.dkgUsageContractsService.getNextUpdateRequestJob(),
            this.dkgUsageContractsService.getNextFinalizeResponseJobs(),
            this.dkgUsageContractsService.getNextResolveJobs(),
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

            if (jobCounters.has(type)) {
                jobCounters.set(type, jobCounters.get(type) + 1);
            } else {
                jobCounters.set(type, 1);
            }
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
        // Add next Rollup job
        if (rollupJobId) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.ROLLUP,
                jobCounters,
            );
            if (!isBlocked) {
                const rollupJob = this.getReducerJob(
                    ReducerJobEnum.ROLLUP,
                    rollupJobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    rollupJob.data,
                    rollupJob.options,
                );
                newJobCounter++;
                this.logger.log('Queued Rollup job: ' + rollupJobId);
            }
        }
        // Add next Update Committee job
        if (updateCommitteeJobId) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.UPDATE_COMMITTEE,
                jobCounters,
            );
            if (!isBlocked) {
                const updateCommitteeJob = this.getReducerJob(
                    ReducerJobEnum.UPDATE_COMMITTEE,
                    updateCommitteeJobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    updateCommitteeJob.data,
                    updateCommitteeJob.options,
                );
                newJobCounter++;
                this.logger.log(
                    'Queued Update Committee job: ' + updateCommitteeJobId,
                );
            }
        }
        // Add next Update Key job
        if (updateKeyJobId) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.UPDATE_KEY,
                jobCounters,
            );
            if (!isBlocked) {
                const updateKeyJob = this.getReducerJob(
                    ReducerJobEnum.UPDATE_KEY,
                    updateKeyJobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    updateKeyJob.data,
                    updateKeyJob.options,
                );
                newJobCounter++;
                this.logger.log('Queued Update Key job: ' + updateKeyJobId);
            }
        }
        // Add next Finalize Round 1 job
        if (finalizeRound1JobIds.length > 0) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.FINALIZE_ROUND_1,
                jobCounters,
            );
            if (!isBlocked) {
                const jobId =
                    finalizeRound1JobIds[
                        Math.floor(Math.random() * finalizeRound1JobIds.length)
                    ];
                const finalizeRound1Job = this.getReducerJob(
                    ReducerJobEnum.FINALIZE_ROUND_1,
                    jobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    finalizeRound1Job.data,
                    finalizeRound1Job.options,
                );
                newJobCounter++;
                this.logger.log(
                    'Queued Finalize Round 1 job: ' +
                        finalizeRound1Job.options.jobId,
                );
            }
        }
        // Add next Finalize Round 2 job
        if (finalizeRound2JobIds.length > 0) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.FINALIZE_ROUND_2,
                jobCounters,
            );
            if (!isBlocked) {
                const jobId =
                    finalizeRound2JobIds[
                        Math.floor(Math.random() * finalizeRound2JobIds.length)
                    ];
                const finalizeRound2Job = this.getReducerJob(
                    ReducerJobEnum.FINALIZE_ROUND_2,
                    jobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    finalizeRound2Job.data,
                    finalizeRound2Job.options,
                );
                newJobCounter++;
                this.logger.log(
                    'Queued Finalize Round 2 job: ' +
                        finalizeRound2Job.options.jobId,
                );
            }
        }
        // Add next Update Task jobs
        if (updateTaskJobIds.length > 0) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.UPDATE_TASK,
                jobCounters,
            );
            if (!isBlocked) {
                for (const jobId of updateTaskJobIds) {
                    const updateTaskJob = this.getReducerJob(
                        ReducerJobEnum.UPDATE_TASK,
                        jobId,
                    );
                    await this.contractServices.add(
                        'handleContractServices',
                        updateTaskJob.data,
                        updateTaskJob.options,
                    );
                    newJobCounter++;
                    this.logger.log(
                        'Queued Update Task job: ' +
                            updateTaskJob.options.jobId,
                    );
                }
            }
        }
        // Add next Update Request job
        if (updateRequestJobId) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.UPDATE_REQUEST,
                jobCounters,
            );
            if (!isBlocked) {
                const updateRequestJob = this.getReducerJob(
                    ReducerJobEnum.UPDATE_REQUEST,
                    updateRequestJobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    updateRequestJob.data,
                    updateRequestJob.options,
                );
                newJobCounter++;
                this.logger.log(
                    'Queued Update Request job: ' +
                        updateRequestJob.options.jobId,
                );
            }
        }
        // Add next Finalize Response jobs
        if (finalizeResponseJobIds.length > 0) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.FINALIZE_RESPONSE,
                jobCounters,
            );
            if (!isBlocked) {
                const jobId =
                    finalizeResponseJobIds[
                        Math.floor(
                            Math.random() * finalizeResponseJobIds.length,
                        )
                    ];
                const finalizeResponseJob = this.getReducerJob(
                    ReducerJobEnum.FINALIZE_RESPONSE,
                    jobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    finalizeResponseJob.data,
                    finalizeResponseJob.options,
                );
                newJobCounter++;
                this.logger.log(
                    'Queued Finalize Response job: ' +
                        finalizeResponseJob.options.jobId,
                );
            }
        }
        // Add next Resolve jobs
        if (resolveJobIds.length > 0) {
            const isBlocked = this.isJobBlocked(
                ReducerJobEnum.RESOLVE,
                jobCounters,
            );
            if (!isBlocked) {
                const jobId =
                    resolveJobIds[
                        Math.floor(Math.random() * resolveJobIds.length)
                    ];
                const resolveJob = this.getReducerJob(
                    ReducerJobEnum.RESOLVE,
                    jobId,
                );
                await this.contractServices.add(
                    'handleContractServices',
                    resolveJob.data,
                    resolveJob.options,
                );
                newJobCounter++;
                this.logger.log(
                    'Queued Resolve job: ' + resolveJob.options.jobId,
                );
            }
        }
        this.logger.log('Queued ' + newJobCounter + ' new jobs!');
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
}
