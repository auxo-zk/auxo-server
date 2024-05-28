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
        this.logger.log('Register compileContracts task at ' + process.pid);
        await this.contractServices.client.flushdb();
        this.contractServices.add('compileContracts', {
            date: Date.now(),
        });
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

    @Cron('*/6 * * * *')
    async handleRollupContractsFirstOrder() {
        const jobCount = await this.contractServices.getJobCounts();
        if (jobCount.active == 0 && jobCount.waiting == 0) {
            this.logger.log(
                'Register rollupContracts for the first order task at ' +
                    process.pid,
            );
            this.contractServices.add('rollupContractsFirstOrder', {
                date: Date.now(),
            });
        }
    }

    @Cron('3,9,15,21,27,33,39,45,51,57 * * * *')
    async handleRollupContractsSecondOrder() {
        const jobCount = await this.contractServices.getJobCounts();
        if (jobCount.active == 0 && jobCount.waiting == 0) {
            this.logger.log(
                'Register rollupContracts for the second order task at ' +
                    process.pid,
            );
            this.contractServices.add('rollupContractsSecondOrder', {
                date: Date.now(),
            });
        }
    }
}
