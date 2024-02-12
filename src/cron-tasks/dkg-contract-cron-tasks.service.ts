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
        this.contractServices.add('compileContracts', {
            date: Date.now(),
        });
    }

    // 6 minutes
    // @Interval(360000)
    // async handleUpdateContracts() {
    //     this.logger.log('Register updateContracts task at ' + process.pid);
    //     this.contractServices.add('updateContracts', {
    //         date: Date.now(),
    //     });
    // }

    @Cron('0,8,16,24,32,40,48,56 * * * *')
    async handleRollupContractsFirstOrder() {
        this.logger.log(
            'Register rollupContracts for the first order task at ' +
                process.pid,
        );
        this.contractServices.add('rollupContractsFirstOrder', {
            date: Date.now(),
        });
    }

    @Cron('4,12,20,28,36,44,52 * * * *')
    async handleRollupContractsSecondOrder() {
        this.logger.log(
            'Register rollupContracts for the second order task at ' +
                process.pid,
        );
        this.contractServices.add('rollupContractsSecondOrder', {
            date: Date.now(),
        });
    }
}
