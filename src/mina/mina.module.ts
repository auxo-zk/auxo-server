import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import { Committee, CommitteeSchema } from 'src/schemas/committee.schema';
import {
    CommitteeAction,
    CommitteeActionSchema,
} from 'src/schemas/committee-action.schema';

import { Network } from './network/network';
import { Ipfs } from 'src/ipfs/ipfs';
import { QueryService } from './query/query.service';
import { CronTaskService } from './cron-task/cron-task.service';
import { CommitteeService } from './committee/committee.service';

import { TestController } from './test/test.controller';
import { CommitteeController } from './committee/committee.controller';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
            { name: CommitteeAction.name, schema: CommitteeActionSchema },
        ]),
        HttpModule,
    ],
    providers: [Network, QueryService, CronTaskService, CommitteeService, Ipfs],
    controllers: [CommitteeController, TestController],
})
export class MinaModule {}
