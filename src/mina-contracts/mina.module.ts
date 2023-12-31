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
import { Round1, Round1Schema } from 'src/schemas/round-1.schema';
import { Round2, Round2Schema } from 'src/schemas/round-2.schema';

import { Network } from './network/network';
import { Ipfs } from 'src/ipfs/ipfs';
import { QueryService } from './query/query.service';
import { CronTasksService } from './cron-tasks/cron-tasks.service';
import { CommitteeContractService } from './committee-contract/committee-contract.service';
import { DkgContractsService } from './dkg-contracts/dkg-contracts.service';

import { DkgUsageContractsService } from './dkg-usage-contracts/dkg-usage-contracts.service';
import {
    RequestAction,
    RequestActionSchema,
} from 'src/schemas/actions/request-action.schema';
import {
    ResponseAction,
    ResponseActionSchema,
} from 'src/schemas/actions/response-action.schema';
import { DkgRequest, DkgRequestSchema } from 'src/schemas/request.schema';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/constants';
import { DkgResponse, DkgResponseSchema } from 'src/schemas/response.schema';
import {
    RawDkgRequest,
    RawDkgRequestSchema,
} from 'src/schemas/raw-request.schema';
import { ProjectContractService } from './project-contract/project-contract.service';
import {
    ProjectAction,
    ProjectActionSchema,
} from 'src/schemas/actions/project-action.schema';
import { RawProject, RawProjectSchema } from 'src/schemas/raw-project.schema';
import { Project, ProjectSchema } from 'src/schemas/project.schema';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
            { name: CommitteeAction.name, schema: CommitteeActionSchema },
            { name: Committee.name, schema: CommitteeSchema },
            { name: DkgAction.name, schema: DkgActionSchema },
            { name: Dkg.name, schema: DkgSchema },
            { name: Round1Action.name, schema: Round1ActionSchema },
            { name: Round1.name, schema: Round1Schema },
            { name: Round2Action.name, schema: Round2ActionSchema },
            { name: Round2.name, schema: Round2Schema },
            { name: Key.name, schema: KeySchema },
            { name: RequestAction.name, schema: RequestActionSchema },
            { name: RawDkgRequest.name, schema: RawDkgRequestSchema },
            { name: DkgRequest.name, schema: DkgRequestSchema },
            { name: ResponseAction.name, schema: ResponseActionSchema },
            { name: DkgResponse.name, schema: DkgResponseSchema },
            { name: ProjectAction.name, schema: ProjectActionSchema },
            { name: RawProject.name, schema: RawProjectSchema },
            { name: Project.name, schema: ProjectSchema },
        ]),
        HttpModule,
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
        CronTasksService,
        CommitteeContractService,
        Ipfs,
        DkgContractsService,
        DkgUsageContractsService,
        ProjectContractService,
    ],
    exports: [CommitteeContractService, DkgContractsService],
})
export class MinaContractsModule {}
