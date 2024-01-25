import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class WorkerCronTasksService implements OnModuleInit {
    private readonly logger = new Logger(WorkerCronTasksService.name);

    constructor(
        @InjectQueue('worker-contract-services')
        private readonly contractServices: Queue,
    ) {}
    async onModuleInit() {
        this.logger.log('Register compileContracts task at ' + process.pid);
        this.contractServices.add('compileContracts', {
            date: Date.now(),
        });
    }

    @Interval(180000)
    async handleUpdateContracts() {
        this.logger.log('Register updateContracts task at ' + process.pid);
        this.contractServices.add('updateContracts', {
            date: Date.now(),
        });
    }

    // @Interval(180000)
    // async handleRollupContracts() {
    //     this.logger.log('Register rollupContracts task at ' + process.pid);
    //     this.contractServices.add('rollupContracts', {
    //         date: Date.now(),
    //     });
    // }
}
