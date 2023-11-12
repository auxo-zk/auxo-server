import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import { Committee, CommitteeSchema } from 'src/schemas/committee.schema';
import {
    CommitteeAction,
    CommitteeActionSchema,
} from 'src/schemas/committee-action.schema';
import { Key, KeySchema } from 'src/schemas/key.schema';

import { Network } from './network/network';
import { Ipfs } from 'src/ipfs/ipfs';
import { QueryService } from './query/query.service';
import { CronTaskService } from './cron-task/cron-task.service';
import { CommitteeService } from './committee/committee.service';
import { DistributedKeyGenerationService } from './distributed-key-generation/distributed-key-generation.service';

import { TestController } from './test/test.controller';
import { CommitteeController } from './committee/committee.controller';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
            { name: CommitteeAction.name, schema: CommitteeActionSchema },
            { name: Key.name, schema: KeySchema },
        ]),
        HttpModule,
    ],
    providers: [
        Network,
        QueryService,
        CronTaskService,
        CommitteeService,
        DistributedKeyGenerationService,
        Ipfs,
    ],
    controllers: [CommitteeController, TestController],
})
export class MinaModule {}
