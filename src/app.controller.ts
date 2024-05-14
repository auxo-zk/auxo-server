import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ServerConfig } from './entities/server-config.entity';
import { InjectModel } from '@nestjs/mongoose';
import { CommitteeAction } from './schemas/actions/committee-action.schema';
import { Model } from 'mongoose';
import { Committee } from './schemas/committee.schema';
import { DkgAction } from './schemas/actions/dkg-action.schema';
import { Round1Action } from './schemas/actions/round-1-action.schema';
import { Round2Action } from './schemas/actions/round-2-action.schema';
import { Key } from './schemas/key.schema';
import { RequestAction } from './schemas/actions/request-action.schema';
import { DkgRequest } from './schemas/request.schema';
import { ResponseAction } from './schemas/actions/response-action.schema';
import { ProjectAction } from './schemas/actions/project-action.schema';
import { Project } from './schemas/project.schema';
import { CampaignAction } from './schemas/actions/campaign-action.schema';
import { Campaign } from './schemas/campaign.schema';
import { ParticipationAction } from './schemas/actions/participation-action.schema';
import { Participation } from './schemas/participation.schema';
import { FundingAction } from './schemas/actions/funding-action.schema';
import { Funding } from './schemas/funding.schema';
import { FundingResult } from './schemas/funding-result.schema';
import { TreasuryManagerAction } from './schemas/actions/treasury-manager-action.schema';
import { Round1Event } from './schemas/actions/round-1-event.schema';
import { Round2Event } from './schemas/actions/round-2-event.schema';
import {
    ResponseFinalizedEvent,
    ResponseProcessedEvent,
    ResponseRespondedEvent,
} from './schemas/actions/response-event.schema';
import { DkgEvent } from './schemas/actions/dkg-event.schema';
import { Task } from './schemas/funding-task.schema';
import { RollupAction } from './schemas/actions/rollup-action.schema';
import { RequesterAction } from './schemas/actions/requester-action.schema';

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        @InjectModel(CommitteeAction.name)
        private readonly committeeActionModel: Model<CommitteeAction>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
        @InjectModel(DkgAction.name)
        private readonly dkgActionModel: Model<DkgAction>,
        @InjectModel(DkgEvent.name)
        private readonly dkgEventModel: Model<DkgEvent>,
        @InjectModel(Round1Action.name)
        private readonly round1ActionModel: Model<Round1Action>,
        @InjectModel(Round1Event.name)
        private readonly round1EventModel: Model<Round1Event>,
        @InjectModel(Round2Action.name)
        private readonly round2ActionModel: Model<Round2Action>,
        @InjectModel(Round2Event.name)
        private readonly round2EventModel: Model<Round2Event>,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(RequestAction.name)
        private readonly requestActionModel: Model<RequestAction>,
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
        @InjectModel(ResponseAction.name)
        private readonly responseActionModel: Model<ResponseAction>,
        @InjectModel(ResponseProcessedEvent.name)
        private readonly responseProcessedEventModel: Model<ResponseProcessedEvent>,
        @InjectModel(ResponseRespondedEvent.name)
        private readonly responseRespondedEventModel: Model<ResponseRespondedEvent>,
        @InjectModel(ResponseFinalizedEvent.name)
        private readonly responseFinalizedEventModel: Model<ResponseFinalizedEvent>,
        @InjectModel(RequesterAction.name)
        private readonly requesterActionModel: Model<RequesterAction>,
        @InjectModel(Task.name)
        private readonly taskModel: Model<Task>,
        @InjectModel(RollupAction.name)
        private readonly rollupActionModel: Model<RollupAction>,
        @InjectModel(ProjectAction.name)
        private readonly projectActionModel: Model<ProjectAction>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
        @InjectModel(CampaignAction.name)
        private readonly campaignActionModel: Model<CampaignAction>,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<Campaign>,
        @InjectModel(ParticipationAction.name)
        private readonly participationActionModel: Model<ParticipationAction>,
        @InjectModel(Participation.name)
        private readonly participationModel: Model<Participation>,
        @InjectModel(FundingAction.name)
        private readonly fundingActionModel: Model<FundingAction>,
        @InjectModel(Funding.name)
        private readonly fundingModel: Model<Funding>,
        @InjectModel(FundingResult.name)
        private readonly fundingResultModel: Model<FundingResult>,
        @InjectModel(TreasuryManagerAction.name)
        private readonly treasuryActionModel: Model<TreasuryManagerAction>,
    ) {}

    @Get()
    getServerConfig(): ServerConfig {
        return this.appService.getServerConfig();
    }

    @Post('reset-contract-collections')
    async resetContractCollections() {
        await this.committeeActionModel.deleteMany({});
        await this.committeeModel.deleteMany({});
        await this.dkgActionModel.deleteMany({});
        await this.dkgEventModel.deleteMany({});
        await this.round1ActionModel.deleteMany({});
        await this.round1EventModel.deleteMany({});
        await this.round2ActionModel.deleteMany({});
        await this.round2EventModel.deleteMany({});
        await this.keyModel.deleteMany({});
        await this.requestActionModel.deleteMany({});
        await this.dkgRequestModel.deleteMany({});
        await this.responseActionModel.deleteMany({});
        await this.responseProcessedEventModel.deleteMany({});
        await this.responseRespondedEventModel.deleteMany({});
        await this.responseFinalizedEventModel.deleteMany({});
        await this.requesterActionModel.deleteMany({});
        await this.taskModel.deleteMany({});
        await this.rollupActionModel.deleteMany({});
        await this.projectActionModel.deleteMany({});
        await this.projectModel.deleteMany({});
        await this.campaignActionModel.deleteMany({});
        await this.campaignModel.deleteMany({});
        await this.participationActionModel.deleteMany({});
        await this.participationModel.deleteMany({});
        await this.fundingActionModel.deleteMany({});
        await this.fundingModel.deleteMany({});
        await this.fundingResultModel.deleteMany({});
        await this.treasuryActionModel.deleteMany({});
    }
}
