import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class BoiContractCronTasksService implements OnModuleInit {
    private readonly logger = new Logger(BoiContractCronTasksService.name);

    constructor(
        @InjectQueue('boi-contract-services')
        private readonly contractServices: Queue,
    ) {}

    async onModuleInit() {
        await this.contractServices.client.flushdb();
        this.logger.log(
            'Registered compiling contracts task at ' + process.pid,
        );
        await this.contractServices.add('handleContractServices', {
            type: 0,
            date: Date.now(),
        });
    }

    @Cron('*/8 * * * *')
    async handleRollupContractsFirstOrder() {
        this.logger.log(
            'Registered rolluping contracts 1st task at ' + process.pid,
        );
        await this.contractServices.add('handleContractServices', {
            type: 1,
            date: Date.now(),
        });
    }

    @Cron('4,12,20,28,36,44,52 * * * *')
    async handleRollupContractsSecondOrder() {
        this.logger.log(
            'Registered rolluping contracts 2nd task at ' + process.pid,
        );
        await this.contractServices.add('handleContractServices', {
            type: 2,
            date: Date.now(),
        });
    }
}
