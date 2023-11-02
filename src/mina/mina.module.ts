import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { Network } from './network/network';
import { QueryService } from './query/query.service';
import { CronTaskService } from './cron-task/cron-task.service';

import { TestController } from './test/test.controller';
import { CommitteeService } from './committee/committee.service';

@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [Network, QueryService, CronTaskService, CommitteeService],
    controllers: [TestController],
})
export class MinaModule {}
