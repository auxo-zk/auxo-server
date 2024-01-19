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
        @InjectQueue('rollupContracts')
        private readonly rollupContractsQueue: Queue,
    ) {}

    // 3 minutes
    // @Interval(180000)
    // async handleUpdateContracts(): Promise<void> {
    //     this.contractServices.add('updateContracts', {
    //         date: Date.now(),
    //     });
    // }

    @Interval(20000)
    handleRollupContracts() {
        console.log('here');
        this.rollupContractsQueue.add({
            date: Date.now(),
        });
    }
}
