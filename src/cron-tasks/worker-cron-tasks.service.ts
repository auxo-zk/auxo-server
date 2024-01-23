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
    async handleRollupContracts() {
        this.logger.log('Register rollupContracts task at ' + process.pid);
        this.logger.log(await this.contractServices.count());
        this.contractServices.add('rollupContracts', {
            date: Date.now(),
        });
    }
}
