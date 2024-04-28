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
import { Dkg, DkgSchema } from 'src/schemas/dkg.schema';
import { Round1, Round1Schema } from 'src/schemas/round-1.schema';
import { Round2, Round2Schema } from 'src/schemas/round-2.schema';
import {
    RequestAction,
    RequestActionSchema,
} from 'src/schemas/actions/request-action.schema';
import {
    ResponseAction,
    ResponseActionSchema,
} from 'src/schemas/actions/response-action.schema';
import { DkgRequest, DkgRequestSchema } from 'src/schemas/request.schema';
import { DkgResponse, DkgResponseSchema } from 'src/schemas/response.schema';
import {
    RawDkgRequest,
    RawDkgRequestSchema,
} from 'src/schemas/raw-request.schema';
import {
    ProjectAction,
    ProjectActionSchema,
} from 'src/schemas/actions/project-action.schema';
import { RawProject, RawProjectSchema } from 'src/schemas/raw-project.schema';
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
import { Treasury, TreasurySchema } from 'src/schemas/treasury.schema';
import { RollupContractService } from './rollup-contract/rollup-contract.service';
import {
    RollupAction,
    RollupActionSchema,
} from 'src/schemas/actions/rollup-action.schema';
import { RequesterContractService } from './requester-contract/requester-contract.service';
import {
    RequesterAction,
    RequesterActionSchema,
} from 'src/schemas/actions/requester-action.schema';

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
            { name: RollupAction.name, schema: RollupActionSchema },
            { name: RequesterAction.name, schema: RequesterActionSchema },
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
        ProjectContractService,
        CampaignContractService,
        ParticipationContractService,
        FundingContractService,
        TreasuryManagerContractService,
        RollupContractService,
        RequesterContractService,
    ],
    exports: [
        CommitteeContractService,
        DkgContractsService,
        DkgUsageContractsService,
        CampaignContractService,
        ParticipationContractService,
        ProjectContractService,
        FundingContractService,
        TreasuryManagerContractService,
    ],
    controllers: [],
})
export class MinaContractsModule {}
