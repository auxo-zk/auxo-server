import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class DkgContractCronTasksService implements OnModuleInit {
    private readonly logger = new Logger(DkgContractCronTasksService.name);

    constructor(
        @InjectQueue('dkg-contract-services')
        private readonly contractServices: Queue,
    ) {}

    async onModuleInit() {
        await this.contractServices.client.flushdb();
        await this.contractServices.add('compileContracts', {
            date: Date.now(),
        });
        this.logger.log('Register compileContracts task at ' + process.pid);
    }

    // 6 minutes
    // @Interval(120000)
    // async handleUpdateContracts() {
    //     this.logger.log('Register updateContracts task at ' + process.pid);
    //     console.log(await this.contractServices.getJobCounts());
    //     this.contractServices.add('updateContracts', {
    //         date: Date.now(),
    //     });
    // }

    @Cron('*/8 * * * *')
    async handleRollupContractsFirstOrder() {
        const activeJobCount = await this.contractServices.getActiveCount();
        const waitingJobCount = await this.contractServices.getWaitingCount();
        if (activeJobCount + waitingJobCount == 0) {
            await this.contractServices.add('rollupContractsFirstOrder', {
                date: Date.now(),
            });
            this.logger.log(
                'Register rollupContracts for the first order task at ' +
                    process.pid,
            );
        }
    }

    @Cron('4,12,20,28,36,44,52 * * * *')
    async handleRollupContractsSecondOrder() {
        const activeJobCount = await this.contractServices.getActiveCount();
        const waitingJobCount = await this.contractServices.getWaitingCount();
        if (activeJobCount + waitingJobCount == 0) {
            await this.contractServices.add('rollupContractsSecondOrder', {
                date: Date.now(),
            });
            this.logger.log(
                'Register rollupContracts for the second order task at ' +
                    process.pid,
            );
        }
    }
}
