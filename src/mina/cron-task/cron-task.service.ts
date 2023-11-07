import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
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

    @Interval(10000000)
    async handleFetchMinaLastBlock(): Promise<void> {
        await fetchLastBlock();
    }

    @Interval(1800000)
    async handleFetchCommitteeEvents(): Promise<void> {
        await this.committeeService.fetchAllCommitteeCreatedEvents();
    }
}
