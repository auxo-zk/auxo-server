import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Network } from './network/network';
import { Ipfs } from 'src/ipfs/ipfs';
import { AppService } from 'src/app.service';
import { QueryService } from './query/query.service';
import { CommitteeContractService } from './committee-contract/committee-contract.service';
import { DkgContractsService } from './dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from './dkg-usage-contracts/dkg-usage-contracts.service';
import { ProjectContractService } from './project-contract/project-contract.service';
import { CampaignContractService } from './campaign-contract/campaign-contract.service';
import { ParticipationContractService } from './participation-contract/participation-contract.service';
import { FundingContractService } from './funding-contract/funding-contract.service';
import { TreasuryManagerContractService } from './treasury-manager-contract/treasury-manager-contract.service';

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
import { RollupContractService } from './rollup-contract/rollup-contract.service';
import {
    RollupAction,
    RollupActionSchema,
} from 'src/schemas/actions/rollup-action.schema';
import { RequesterContractsService } from './requester-contract/requester-contract.service';
import {
    RequesterAction,
    RequesterActionSchema,
} from 'src/schemas/actions/requester-action.schema';
import { Task, TaskSchema } from 'src/schemas/task.schema';
import { DkgEvent, DkgEventSchema } from 'src/schemas/actions/dkg-event.schema';
import {
    Round1Event,
    Round1EventSchema,
} from 'src/schemas/actions/round-1-event.schema';
import {
    Round2Event,
    Round2EventSchema,
} from 'src/schemas/actions/round-2-event.schema';
import {
    ResponseFinalizedEvent,
    ResponseFinalizedEventSchema,
    ResponseProcessedEvent,
    ResponseProcessedEventSchema,
    ResponseRespondedEvent,
    ResponseRespondedEventSchema,
} from 'src/schemas/actions/response-event.schema';
import {
    CampaignResult,
    CampaignResultSchema,
} from 'src/schemas/campaign-result.schema';
import {
    RequestEvent,
    RequestEventSchema,
} from 'src/schemas/actions/request-event.schema';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
            { name: CampaignAction.name, schema: CampaignActionSchema },
            { name: CommitteeAction.name, schema: CommitteeActionSchema },
            { name: DkgAction.name, schema: DkgActionSchema },
            { name: DkgEvent.name, schema: DkgEventSchema },
            { name: FundingAction.name, schema: FundingActionSchema },
            {
                name: RequesterAction.name,
                schema: RequesterActionSchema,
            },
            {
                name: ParticipationAction.name,
                schema: ParticipationActionSchema,
            },
            { name: ProjectAction.name, schema: ProjectActionSchema },
            { name: RequestAction.name, schema: RequestActionSchema },
            { name: RequestEvent.name, schema: RequestEventSchema },
            { name: ResponseAction.name, schema: ResponseActionSchema },
            {
                name: ResponseProcessedEvent.name,
                schema: ResponseProcessedEventSchema,
            },
            {
                name: ResponseFinalizedEvent.name,
                schema: ResponseFinalizedEventSchema,
            },
            {
                name: ResponseRespondedEvent.name,
                schema: ResponseRespondedEventSchema,
            },
            { name: RollupAction.name, schema: RollupActionSchema },
            { name: Round1Action.name, schema: Round1ActionSchema },
            { name: Round1Event.name, schema: Round1EventSchema },
            { name: Round2Action.name, schema: Round2ActionSchema },
            { name: Round2Event.name, schema: Round2EventSchema },
            {
                name: TreasuryManagerAction.name,
                schema: TreasuryManagerActionSchema,
            },
            { name: CampaignResult.name, schema: CampaignResultSchema },
            { name: Campaign.name, schema: CampaignSchema },
            { name: Committee.name, schema: CommitteeSchema },
            { name: FundingResult.name, schema: FundingResultSchema },
            { name: Task.name, schema: TaskSchema },
            { name: Funding.name, schema: FundingSchema },
            { name: Key.name, schema: KeySchema },
            {
                name: Participation.name,
                schema: ParticipationSchema,
            },
            { name: Project.name, schema: ProjectSchema },
            { name: DkgRequest.name, schema: DkgRequestSchema },
        ]),
        HttpModule,
    ],
    providers: [
        Network,
        AppService,
        QueryService,
        CommitteeContractService,
        Ipfs,
        DkgContractsService,
        DkgUsageContractsService,
        RollupContractService,
        ProjectContractService,
        CampaignContractService,
        ParticipationContractService,
        FundingContractService,
        TreasuryManagerContractService,
        RequesterContractsService,
    ],
    exports: [
        CommitteeContractService,
        DkgContractsService,
        DkgUsageContractsService,
        RollupContractService,
        CampaignContractService,
        ParticipationContractService,
        ProjectContractService,
        FundingContractService,
        TreasuryManagerContractService,
        RequesterContractsService,
    ],
    controllers: [],
})
export class MinaContractsModule {}
