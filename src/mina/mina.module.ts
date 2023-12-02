import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { join } from 'path';

import { Committee, CommitteeSchema } from 'src/schemas/committee.schema';
import {
    CommitteeAction,
    CommitteeActionSchema,
} from 'src/schemas/actions/committee-action.schema';
import {
    DkgAction,
    DkgActionSchema,
} from 'src/schemas/actions/dkg-action.schema';
import {
    Round1Action,
    Round1ActionSchema,
} from 'src/schemas/actions/round-1-action.schema';
import {
    Round2Action,
    Round2ActionSchema,
} from 'src/schemas/actions/round-2-action.schema';
import { Key, KeySchema } from 'src/schemas/key.schema';
import { Dkg, DkgSchema } from 'src/schemas/dkg.schema';
import {
    Round1Contribution,
    Round1ContributionSchema,
} from 'src/schemas/round-1-contribution.schema';

import { Network } from './network/network';
import { Ipfs } from 'src/ipfs/ipfs';
import { QueryService } from './query/query.service';
import { CronTaskService } from './cron-task/cron-task.service';
import { CommitteeService } from './committee/committee.service';
import { DkgService } from './dkg/dkg.service';

import { TestController } from './test/test.controller';
import { CommitteeController } from './committee/committee.controller';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
            { name: Committee.name, schema: CommitteeSchema },
            { name: CommitteeAction.name, schema: CommitteeActionSchema },
            { name: DkgAction.name, schema: DkgActionSchema },
            { name: Dkg.name, schema: DkgSchema },
            { name: Round1Action.name, schema: Round1ActionSchema },
            { name: Round1Contribution.name, schema: Round1ContributionSchema },
            { name: Round2Action.name, schema: Round2ActionSchema },
            { name: Key.name, schema: KeySchema },
        ]),
        HttpModule,
        CacheModule.register(),
        BullModule.forRoot({
            redis: {
                host: 'localhost',
                port: 6379,
            },
        }),
        BullModule.registerQueue({
            name: 'rollup-committee',
            processors: [join(__dirname, 'rollup-committee-processor.js')],
        }),
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
