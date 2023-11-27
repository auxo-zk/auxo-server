import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import { Committee, CommitteeSchema } from 'src/schemas/committee.schema';
import {
    CommitteeAction,
    CommitteeActionSchema,
} from 'src/schemas/actions/committee-action.schema';
import {
    DkgAction,
    DKGActionSchema,
} from 'src/schemas/actions/dkg-action.schema';
import {
    Round1Action,
    Round1ActionSchema,
} from 'src/schemas/actions/round-1-action.schema';
import {
    Round2Action,
    Round2ActionSchema,
} from 'src/schemas/actions/round-2-action.schema';

import { Network } from './network/network';
import { Ipfs } from 'src/ipfs/ipfs';
import { QueryService } from './query/query.service';
import { CronTaskService } from './cron-task/cron-task.service';
import { CommitteeService } from './committee/committee.service';

import { TestController } from './test/test.controller';
import { CommitteeController } from './committee/committee.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { DkgService } from './dkg/dkg.service';
import { Key, KeySchema } from 'src/schemas/key.schema';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
            { name: CommitteeAction.name, schema: CommitteeActionSchema },
            { name: DkgAction.name, schema: DKGActionSchema },
            { name: Round1Action.name, schema: Round1ActionSchema },
            { name: Round2Action.name, schema: Round2ActionSchema },
            { name: Key.name, schema: KeySchema },
        ]),
        HttpModule,
        CacheModule.register(),
    ],
    providers: [
        Network,
        QueryService,
        CronTaskService,
        CommitteeService,
        Ipfs,
        DkgService,
    ],
    controllers: [CommitteeController, TestController],
})
export class MinaModule {}
