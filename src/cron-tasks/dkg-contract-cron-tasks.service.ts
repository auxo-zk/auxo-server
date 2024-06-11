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
import { Reducer } from 'o1js';

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
        this.logger.log(
            'Registered compiling contracts task at ' + process.pid,
        );
    }

    // @Cron('*/8 * * * *')
    // async handleRollupContractsFirstOrder() {
    //     this.logger.log(
    //         'Registered rolluping contracts 1st task at ' + process.pid,
    //     );
    //     await this.contractServices.add('handleContractServices', {
    //         type: 1,
    //         date: Date.now(),
    //     });
    // }

    // @Cron('4,12,20,28,36,44,52 * * * *')
    // async handleRollupContractsSecondOrder() {
    //     this.logger.log(
    //         'Registered rolluping contracts 2nd task at ' + process.pid,
    //     );
    //     await this.contractServices.add('handleContractServices', {
    //         type: 2,
    //         date: Date.now(),
    //     });
    // }

    @Cron('*/4 * * * *')
    async queueReducerJobs() {
        this.logger.log('Querying next reducer jobs...');
        const [
            rollupJobId,
            updateCommitteeJobId,
            updateKeyJobId,
            finalizeRound1JobIds,
            FinalizeRound2JobIds,
        ] = await Promise.all([
            this.rollupContractService.getNextRollupJob(),
            this.committeeContractService.getNextUpdateCommitteeJob(),
            this.dkgContractsService.getNextUpdateKeyJob(),
            this.dkgContractsService.getNextFinalizeRound1Jobs(),
            this.dkgContractsService.getNextFinalizeRound2Jobs(),
        ]);
        const queuedJobs = await this.contractServices.getJobs([
            'active',
            'waiting',
            'delayed',
            'paused',
            'delayed',
        ]);
        let jobCounters: Map<ReducerJobEnum, number>;
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

        let newJobCounter = 0;

        // Add next Rollup job
        if (jobCounters[ReducerJobEnum.ROLLUP] == 0 && rollupJobId) {
            let isBlocked = false;
            if (ReducerDependencies.get(ReducerJobEnum.ROLLUP)) {
                for (const dependency of ReducerDependencies.get(
                    ReducerJobEnum.ROLLUP,
                )) {
                    if (jobCounters[dependency] > 0) {
                        isBlocked = true;
                        break;
                    }
                }
            }
            if (!isBlocked) {
                const rollupJob: ReducerJob = {
                    options: {
                        jobId: rollupJobId,
                        priority: ReducerPriorities.get(ReducerJobEnum.ROLLUP),
                    },
                    data: {
                        type: ReducerJobEnum.ROLLUP,
                        date: Date.now(),
                    },
                };
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
        if (
            jobCounters[ReducerJobEnum.UPDATE_COMMITTEE] == 0 &&
            updateCommitteeJobId
        ) {
            let isBlocked = false;
            if (ReducerDependencies.get(ReducerJobEnum.UPDATE_COMMITTEE)) {
                for (const dependency of ReducerDependencies.get(
                    ReducerJobEnum.UPDATE_COMMITTEE,
                )) {
                    if (jobCounters[dependency] > 0) {
                        isBlocked = true;
                        break;
                    }
                }
            }
            if (!isBlocked) {
                const updateCommitteeJob: ReducerJob = {
                    options: {
                        jobId: updateCommitteeJobId,
                        priority: ReducerPriorities.get(
                            ReducerJobEnum.UPDATE_COMMITTEE,
                        ),
                    },
                    data: {
                        type: ReducerJobEnum.UPDATE_COMMITTEE,
                        date: Date.now(),
                    },
                };
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
        if (jobCounters[ReducerJobEnum.UPDATE_KEY] == 0 && updateKeyJobId) {
            let isBlocked = false;
            if (ReducerDependencies.get(ReducerJobEnum.UPDATE_KEY)) {
                for (const dependency of ReducerDependencies.get(
                    ReducerJobEnum.UPDATE_KEY,
                )) {
                    if (jobCounters[dependency] > 0) {
                        isBlocked = true;
                        break;
                    }
                }
            }
            if (!isBlocked) {
                const updateKeyJob: ReducerJob = {
                    options: {
                        jobId: updateKeyJobId,
                        priority: ReducerPriorities.get(
                            ReducerJobEnum.UPDATE_KEY,
                        ),
                    },
                    data: {
                        type: ReducerJobEnum.UPDATE_KEY,
                        date: Date.now(),
                    },
                };
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
        if (
            jobCounters[ReducerJobEnum.FINALIZE_ROUND_1] == 0 &&
            finalizeRound1JobIds.length > 0
        ) {
            let isBlocked = false;
            if (ReducerDependencies.get(ReducerJobEnum.FINALIZE_ROUND_1)) {
                for (const dependency of ReducerDependencies.get(
                    ReducerJobEnum.FINALIZE_ROUND_1,
                )) {
                    if (jobCounters[dependency] > 0) {
                        isBlocked = true;
                        break;
                    }
                }
            }
            if (!isBlocked) {
                const jobId =
                    finalizeRound1JobIds[
                        Math.floor(Math.random() * finalizeRound1JobIds.length)
                    ];
                const finalizeRound1Job: ReducerJob = {
                    options: {
                        jobId: jobId,
                        priority: ReducerPriorities.get(
                            ReducerJobEnum.FINALIZE_ROUND_1,
                        ),
                    },
                    data: {
                        type: ReducerJobEnum.FINALIZE_ROUND_1,
                        date: Date.now(),
                    },
                };
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
        if (
            jobCounters[ReducerJobEnum.FINALIZE_ROUND_2] == 0 &&
            FinalizeRound2JobIds.length > 0
        ) {
            let isBlocked = false;
            if (ReducerDependencies.get(ReducerJobEnum.FINALIZE_ROUND_2)) {
                for (const dependency of ReducerDependencies.get(
                    ReducerJobEnum.FINALIZE_ROUND_2,
                )) {
                    if (jobCounters[dependency] > 0) {
                        isBlocked = true;
                        break;
                    }
                }
            }
            if (!isBlocked) {
                const jobId =
                    FinalizeRound2JobIds[
                        Math.floor(Math.random() * FinalizeRound2JobIds.length)
                    ];
                const finalizeRound2Job: ReducerJob = {
                    options: {
                        jobId: jobId,
                        priority: ReducerPriorities.get(
                            ReducerJobEnum.FINALIZE_ROUND_2,
                        ),
                    },
                    data: {
                        type: ReducerJobEnum.FINALIZE_ROUND_2,
                        date: Date.now(),
                    },
                };
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

        this.logger.log('Queued ' + newJobCounter + ' new jobs!');
    }
}
