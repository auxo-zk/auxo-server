import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ServerConfig } from './entities/server-config.entity';
import { InjectModel } from '@nestjs/mongoose';
import { CommitteeAction } from './schemas/actions/committee-action.schema';
import { Model } from 'mongoose';
import { Committee } from './schemas/committee.schema';
import { DkgAction } from './schemas/actions/dkg-action.schema';
import { Dkg } from './schemas/dkg.schema';
import { Round1Action } from './schemas/actions/round-1-action.schema';
import { Round1 } from './schemas/round-1.schema';
import { Round2Action } from './schemas/actions/round-2-action.schema';
import { Round2 } from './schemas/round-2.schema';
import { Key } from './schemas/key.schema';
import { RequestAction } from './schemas/actions/request-action.schema';
import { RawDkgRequest } from './schemas/raw-request.schema';
import { DkgRequest } from './schemas/request.schema';
import { ResponseAction } from './schemas/actions/response-action.schema';
import { DkgResponse } from './schemas/response.schema';
import { ProjectAction } from './schemas/actions/project-action.schema';
import { RawProject } from './schemas/raw-project.schema';
import { Project } from './schemas/project.schema';
import { CampaignAction } from './schemas/actions/campaign-action.schema';
import { RawCampaign } from './schemas/raw-campaign.schema';
import { Campaign } from './schemas/campaign.schema';
import { ParticipationAction } from './schemas/actions/participation-action.schema';
import { Participation } from './schemas/participation.schema';
import { FundingAction } from './schemas/actions/funding-action.schema';
import { Funding } from './schemas/funding.schema';
import { FundingResult } from './schemas/funding-result.schema';
import { TreasuryAction } from './schemas/actions/treasury-action.schema';
import { Treasury } from './schemas/treasury.schema';

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
        @InjectModel(Dkg.name)
        private readonly dkgModel: Model<Dkg>,
        @InjectModel(Round1Action.name)
        private readonly round1ActionModel: Model<Round1Action>,
        @InjectModel(Round1.name)
        private readonly round1Model: Model<Round1>,
        @InjectModel(Round2Action.name)
        private readonly round2ActionModel: Model<Round2Action>,
        @InjectModel(Round2.name)
        private readonly round2Model: Model<Round2>,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(RequestAction.name)
        private readonly requestActionModel: Model<RequestAction>,
        @InjectModel(RawDkgRequest.name)
        private readonly rawDkgRequestModel: Model<RawDkgRequest>,
        @InjectModel(DkgRequest.name)
        private readonly dkgRequestModel: Model<DkgRequest>,
        @InjectModel(ResponseAction.name)
        private readonly responseActionModel: Model<ResponseAction>,
        @InjectModel(DkgResponse.name)
        private readonly dkgResponseModel: Model<DkgResponse>,
        @InjectModel(ProjectAction.name)
        private readonly projectActionModel: Model<ProjectAction>,
        @InjectModel(RawProject.name)
        private readonly rawProjectModel: Model<RawProject>,
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
        @InjectModel(CampaignAction.name)
        private readonly campaignActionModel: Model<CampaignAction>,
        @InjectModel(RawCampaign.name)
        private readonly rawCampaignModel: Model<RawCampaign>,
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
        @InjectModel(TreasuryAction.name)
        private readonly treasuryActionModel: Model<TreasuryAction>,
        @InjectModel(Treasury.name)
        private readonly treasuryModel: Model<Treasury>,
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
        await this.dkgModel.deleteMany({});
        await this.round1ActionModel.deleteMany({});
        await this.round1Model.deleteMany({});
        await this.round2ActionModel.deleteMany({});
        await this.round2Model.deleteMany({});
        await this.keyModel.deleteMany({});
        await this.requestActionModel.deleteMany({});
        await this.rawDkgRequestModel.deleteMany({});
        await this.dkgRequestModel.deleteMany({});
        await this.responseActionModel.deleteMany({});
        await this.dkgResponseModel.deleteMany({});
        await this.projectActionModel.deleteMany({});
        await this.rawProjectModel.deleteMany({});
        await this.projectModel.deleteMany({});
        await this.rawCampaignModel.deleteMany({});
        await this.campaignModel.deleteMany({});
        await this.participationActionModel.deleteMany({});
        await this.participationModel.deleteMany({});
        await this.fundingActionModel.deleteMany({});
        await this.fundingModel.deleteMany({});
        await this.fundingResultModel.deleteMany({});
        await this.treasuryActionModel.deleteMany({});
        await this.treasuryModel.deleteMany({});
    }
}
