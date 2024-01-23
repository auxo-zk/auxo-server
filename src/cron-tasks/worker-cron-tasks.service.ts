import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class WorkerCronTasksService {
    private readonly logger = new Logger(WorkerCronTasksService.name);

    constructor(
        @InjectQueue('contract-services')
        private readonly contractServices: Queue,
    ) {}

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
