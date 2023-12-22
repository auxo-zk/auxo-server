import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { fetchLastBlock } from 'o1js';
import { QueryService } from '../query/query.service';
import { CommitteesService } from '../committees/committees.service';

@Injectable()
export class CronTaskService {
    private readonly logger = new Logger(CronTaskService.name);

    constructor(
        private readonly queryService: QueryService,
        private readonly committeesService: CommitteesService,
    ) {}

    // 3 minutes
    @Interval(180000)
    async handleNewBlock(): Promise<void> {
        await fetchLastBlock();
        await this.committeesService.update();
    }

    @Interval(300000)
    async handleFetchCommitteeEvents(): Promise<void> {
        // await this.committeesService.fetchCommitteeCreatedEvents();
    }
}
