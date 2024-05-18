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

    // 6 minutes
    // @Interval(120000)
    // async handleUpdateContracts() {
    //     this.logger.log('Register updateContracts task at ' + process.pid);
    //     this.contractServices.add('updateContractMerkleTrees', {
    //         date: Date.now(),
    //     });
    //     this.contractServices.add('updateContracts', {
    //         date: Date.now(),
    //     });
    // }

    // 6 minutes
    // @Interval(360000)
    // async handleUpdateContractMerkleTrees(): Promise<void> {
    //     this.logger.log(
    //         'Register updateContractMerkleTrees task at ' + process.pid,
    //     );
    //     this.contractServices.add('updateContractMerkleTrees', {
    //         date: Date.now(),
    //     });
    // }
}
