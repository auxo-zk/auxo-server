import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class CronTasksService {
    private readonly logger = new Logger(CronTasksService.name);

    constructor(
        @InjectQueue('contract-services')
        private readonly contractServices: Queue,
    ) {}

    // 3 minutes
    @Interval(180000)
    async handleUpdateContracts(): Promise<void> {
        this.logger.log('Register updateContracts task at', process.pid);
        this.contractServices.add('updateContracts', {
            date: Date.now(),
        });
    }

    @Interval(30000)
    async handleRollupContracts() {
        this.logger.log('Register rollupContracts task', process.pid);
        this.logger.log(await this.contractServices.count());
        this.contractServices.add('rollupContracts', {
            date: Date.now(),
        });
    }
}
