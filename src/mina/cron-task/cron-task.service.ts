import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { fetchLastBlock } from 'o1js';
import { QueryService } from '../query/query.service';
import { CommitteeService } from '../committee/committee.service';

@Injectable()
export class CronTaskService {
    private readonly logger = new Logger(CronTaskService.name);

    constructor(
        private readonly queryService: QueryService,
        private readonly committeeService: CommitteeService,
    ) {}

    @Cron('45 * * * * *')
    handleCron(): void {
        this.logger.debug('task scheduler');
    }

    @Interval(1800000)
    async handleFetchMinaLastBlock(): Promise<void> {
        await fetchLastBlock();
    }

    @Interval(1800000)
    async handleFetchCommitteeEvents(): Promise<void> {
        await this.committeeService.fetchEvents();
    }
}
