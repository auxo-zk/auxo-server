import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { MethodInputsService } from './method-inputs.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('method-inputs')
export class MethodInputsController {
    constructor(private readonly methodInputsService: MethodInputsService) {}

    @Get('dkg-contract/generate-key')
    @ApiTags('Method Inputs')
    async getDkgContractGenerateKey(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('memberId', new ParseIntPipe()) memberId: number,
    ) {
        return this.methodInputsService.getDkgContractGenerateKey(
            committeeId,
            memberId,
        );
    }

    @Get('round1-contract/contribute')
    @ApiTags('Method Inputs')
    async getRound1ContractContribute(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('memberId', new ParseIntPipe()) memberId: number,
    ) {
        return this.methodInputsService.getRound1ContractContribute(
            committeeId,
            memberId,
        );
    }

    @Get('round1-contract/finalize')
    @ApiTags('Method Inputs')
    async getRound1ContractFinalize(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('keyId', new ParseIntPipe()) keyId: number,
    ) {
        return this.methodInputsService.getRound1ContractFinalize(
            committeeId,
            keyId,
        );
    }

    @Get('round2-contract/contribute')
    @ApiTags('Method Inputs')
    async getRound2ContractContribute(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('keyId', new ParseIntPipe()) keyId: number,
        @Query('memberId', new ParseIntPipe()) memberId: number,
    ) {
        return this.methodInputsService.getRound2ContractContribute(
            committeeId,
            keyId,
            memberId,
        );
    }

    @Get('round2-contract/finalize')
    @ApiTags('Method Inputs')
    async getRound2ContractFinalize(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('keyId', new ParseIntPipe()) keyId: number,
    ) {
        return this.methodInputsService.getRound2ContractFinalize(
            committeeId,
            keyId,
        );
    }

    @Get('response-contract/contribute')
    @ApiTags('Method Inputs')
    async getResponseContractContribute(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('memberId', new ParseIntPipe()) memberId: number,
        @Query('keyId', new ParseIntPipe()) keyId: number,
        @Query('requestId', new ParseIntPipe()) requestId: number,
    ) {
        return await this.methodInputsService.getResponseContractContribute(
            committeeId,
            memberId,
            keyId,
            requestId,
        );
    }

    @Get('requester-contract/create-task')
    @ApiTags('Method Inputs')
    async getRequesterContractCreateTask(
        @Query('requesterAddress') requesterAddress: string,
    ) {
        return await this.methodInputsService.getRequesterContractCreateTask(
            requesterAddress,
        );
    }

    @Get('requester-contract/submit-encryption')
    @ApiTags('Method Inputs')
    async getRequesterContractSubmitEncryption(
        @Query('requesterAddress') requesterAddress: string,
        @Query('taskId', new ParseIntPipe()) taskId: number,
    ) {
        return await this.methodInputsService.getRequesterContractSubmitEncryption(
            requesterAddress,
            taskId,
        );
    }

    @Get('requester-contract/finalize')
    @ApiTags('Method Inputs')
    async getRequesterContractFinalize(
        @Query('requesterAddress') requesterAddress: string,
        @Query('taskId', new ParseIntPipe()) taskId: number,
    ) {
        return await this.methodInputsService.getRequesterContractFinalize(
            requesterAddress,
            taskId,
        );
    }

    @Get('project-contract/update-project')
    @ApiTags('Method Inputs')
    async getProjectContractUpdateProject(
        @Query('projectId', new ParseIntPipe()) projectId: number,
    ) {
        return this.methodInputsService.getProjectContractUpdateProject(
            projectId,
        );
    }

    @Get('campaign-contract/create-campaign')
    @ApiTags('Method Inputs')
    async getCampaignContractCreateCampaign(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('keyId', new ParseIntPipe()) keyId: number,
    ) {
        return this.methodInputsService.getCampaignContractCreateCampaign(
            committeeId,
            keyId,
        );
    }

    @Get('participation-contract/participate-campaign')
    @ApiTags('Method Inputs')
    async getParticipationContractParticipateCampaign(
        @Query('campaignId', new ParseIntPipe()) campaignId: number,
        @Query('projectId', new ParseIntPipe()) projectId: number,
    ) {
        return this.methodInputsService.getParticipationContractParticipateCampaign(
            campaignId,
            projectId,
        );
    }

    @Get('funding-contract/fund')
    @ApiTags('Method Inputs')
    async getFundingContractFund(
        @Query('campaignId', new ParseIntPipe()) campaignId: number,
    ) {
        return this.methodInputsService.getFundingContractFund(campaignId);
    }

    @Get('funding-contract/refund')
    @ApiTags('Method Inputs')
    async getFundingContractRefund(
        @Query('fundingId', new ParseIntPipe()) fundingId: number,
        @Query('campaignId', new ParseIntPipe()) campaignId: number,
    ) {
        return this.methodInputsService.getFundingContractRefund(
            fundingId,
            campaignId,
        );
    }
}
