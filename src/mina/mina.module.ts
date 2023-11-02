import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';

import { Committee, CommitteeSchema } from 'src/schemas/committee.schema';

import { Network } from './network/network';
import { QueryService } from './query/query.service';
import { CronTaskService } from './cron-task/cron-task.service';
import { CommitteeService } from './committee/committee.service';

import { TestController } from './test/test.controller';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
        ]),
    ],
    providers: [Network, QueryService, CronTaskService, CommitteeService],
    controllers: [TestController],
})
export class MinaModule {}
