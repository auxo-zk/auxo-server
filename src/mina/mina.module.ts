import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';

import { Committee, CommitteeSchema } from 'src/schemas/committee.schema';
import {
    CommitteeAction,
    CommitteeActionSchema,
} from 'src/schemas/committee-action.schema';
import { Key, KeySchema } from 'src/schemas/key.schema';

import { Network } from './network/network';
import { QueryService } from './query/query.service';
import { CronTaskService } from './cron-task/cron-task.service';
import { CommitteeService } from './committee/committee.service';

import { TestController } from './test/test.controller';
import { DistributedKeyGenerationService } from './distributed-key-generation/distributed-key-generation.service';
import { Ipfs } from 'src/ipfs/ipfs';
import { HttpModule } from '@nestjs/axios';

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
    controllers: [TestController],
})
export class MinaModule {}
