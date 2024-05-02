import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaContractsModule } from './mina-contracts/mina-contracts.module';
import { HttpModule } from '@nestjs/axios';

import { AppService } from './app.service';

import { AppController } from './app.controller';
import { Ipfs } from './ipfs/ipfs';
import { IpfsController } from './ipfs/ipfs.controller';
import { ApisModule } from './apis/apis.module';
import { ObjectStorageService } from './object-storage/object-storage.service';
import { ObjectStorageController } from './object-storage/object-storage.controller';
import { MainCronTasksService } from './cron-tasks/main-cron-tasks.service';
import { BullModule } from '@nestjs/bull';

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
import {
    RequestAction,
    RequestActionSchema,
} from 'src/schemas/actions/request-action.schema';
import {
    ResponseAction,
    ResponseActionSchema,
} from 'src/schemas/actions/response-action.schema';
import { DkgRequest, DkgRequestSchema } from 'src/schemas/request.schema';
import {
    ProjectAction,
    ProjectActionSchema,
} from 'src/schemas/actions/project-action.schema';
import { Project, ProjectSchema } from 'src/schemas/project.schema';
import {
    CampaignAction,
    CampaignActionSchema,
} from 'src/schemas/actions/campaign-action.schema';
import { Campaign, CampaignSchema } from 'src/schemas/campaign.schema';
import {
    ParticipationAction,
    ParticipationActionSchema,
} from 'src/schemas/actions/participation-action.schema';
import {
    Participation,
    ParticipationSchema,
} from 'src/schemas/participation.schema';
import {
    FundingAction,
    FundingActionSchema,
} from 'src/schemas/actions/funding-action.schema';
import { Funding, FundingSchema } from 'src/schemas/funding.schema';
import {
    FundingResult,
    FundingResultSchema,
} from 'src/schemas/funding-result.schema';
import {
    TreasuryManagerAction,
    TreasuryManagerActionSchema,
} from 'src/schemas/actions/treasury-manager-action.schema';
import { MainContractServicesConsumer } from './consumers/main-contract-services.consumer';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.DB, {
            connectTimeoutMS: 10000,
            socketTimeoutMS: 10000,
        }),
        MongooseModule.forFeature([
            { name: CommitteeAction.name, schema: CommitteeActionSchema },
            { name: Committee.name, schema: CommitteeSchema },
            { name: DkgAction.name, schema: DkgActionSchema },
            { name: Round1Action.name, schema: Round1ActionSchema },
            { name: Round2Action.name, schema: Round2ActionSchema },
            { name: Key.name, schema: KeySchema },
            { name: RequestAction.name, schema: RequestActionSchema },
            { name: DkgRequest.name, schema: DkgRequestSchema },
            { name: ResponseAction.name, schema: ResponseActionSchema },
            { name: ProjectAction.name, schema: ProjectActionSchema },
            { name: Project.name, schema: ProjectSchema },
            { name: CampaignAction.name, schema: CampaignActionSchema },
            { name: Campaign.name, schema: CampaignSchema },
            {
                name: ParticipationAction.name,
                schema: ParticipationActionSchema,
            },
            {
                name: Participation.name,
                schema: ParticipationSchema,
            },
            { name: FundingAction.name, schema: FundingActionSchema },
            { name: Funding.name, schema: FundingSchema },
            { name: FundingResult.name, schema: FundingResultSchema },
            {
                name: TreasuryManagerAction.name,
                schema: TreasuryManagerActionSchema,
            },
        ]),
        MongooseModule.forFeature([]),
        MinaContractsModule,
        ApisModule,
        HttpModule,
        BullModule.forRootAsync({
            useFactory: () => ({
                redis: {
                    host: 'localhost',
                    port: 6379,
                },
            }),
        }),
        BullModule.registerQueue({
            name: 'main-contract-services',
        }),
    ],
    controllers: [AppController, IpfsController, ObjectStorageController],
    providers: [
        AppService,
        Ipfs,
        ObjectStorageService,
        MainCronTasksService,
        MainContractServicesConsumer,
    ],
    exports: [AppService],
})
export class AppModule {}
