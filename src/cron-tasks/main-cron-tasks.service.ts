import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class MainCronTasksService {
    private readonly logger = new Logger(MainCronTasksService.name);

    constructor(
        @InjectQueue('main-contract-services')
        private readonly contractServices: Queue,
    ) {}

    // 3 minutes
    @Interval(180000)
    async handleUpdateContractMerkleTrees(): Promise<void> {
        this.logger.log(
            'Register updateContractMerkleTrees task at ' + process.pid,
        );
        this.contractServices.add('updateContractMerkleTrees', {
            date: Date.now(),
        });
    }
}
