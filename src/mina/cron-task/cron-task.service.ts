import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { fetchLastBlock } from 'o1js';
import { QueryService } from '../query/query.service';

@Injectable()
export class CronTaskService {
    private readonly logger = new Logger(CronTaskService.name);

    constructor(private readonly queryService: QueryService) {}

    @Cron('45 * * * * *')
    handleCron() {
        this.logger.debug('task scheduler');
    }

    @Interval(1800000)
    async handleFetchMinaLastBlock() {
        await fetchLastBlock();
    }

    @Interval(1800000)
    async handleFetchCommitteeEvents() {
        await this.queryService.fetchEvents(process.env.COMMITTEE_ADDRESS);
    }
}
