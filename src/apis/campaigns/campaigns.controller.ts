import {
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { ApiTags } from '@nestjs/swagger';
import { Campaign } from 'src/schemas/campaign.schema';
import { CreateCampaignDto } from 'src/dtos/create-campaign.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';

@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) {}

    @Post()
    @ApiTags('Campaign')
    async createCampaign(
        @Body() createCampaignDto: CreateCampaignDto,
    ): Promise<IpfsResponse> {
        return await this.campaignsService.createCampaign(createCampaignDto);
    }

    @Get('all')
    @ApiTags('Campaign')
    async getAllCampaigns(): Promise<Campaign[]> {
        return this.campaignsService.getCampaigns(undefined);
    }

    @Get()
    @ApiTags('Campaign')
    async getCampaigns(@Query('owner') owner?: string): Promise<Campaign[]> {
        return this.campaignsService.getCampaigns(owner);
    }

    @Get(':campaignId/projects')
    @ApiTags('Campaign')
    async getProjects(
        @Param('campaignId', ParseIntPipe) campaignId: number,
    ): Promise<any> {
        return this.campaignsService.getProjects(campaignId);
    }

    @Get(':campaignId/result')
    @ApiTags('Campaign')
    async getCampaignResult(
        @Param('campaignId', ParseIntPipe) campaignId: number,
    ): Promise<any> {
        return this.campaignsService.getCampaignResult(campaignId);
    }

    @Get(':campaignId')
    @ApiTags('Campaign')
    async getCampaign(
        @Param('campaignId', ParseIntPipe) campaignId: number,
    ): Promise<Campaign> {
        return this.campaignsService.getCampaign(campaignId);
    }
}
