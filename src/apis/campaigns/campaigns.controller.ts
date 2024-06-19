import {
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    Param,
    ParseBoolPipe,
    ParseIntPipe,
    Post,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Campaign } from 'src/schemas/campaign.schema';
import { CreateCampaignDto } from 'src/dtos/create-campaign.dto';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) {}

    @Post()
    @ApiTags('Campaign')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async createCampaign(
        @Body() createCampaignDto: CreateCampaignDto,
        @Request() req: any,
    ): Promise<IpfsResponse> {
        return await this.campaignsService.createCampaign(
            createCampaignDto,
            req.user,
        );
    }

    @Get('all')
    @ApiTags('Campaign')
    async getAllCampaigns(): Promise<Campaign[]> {
        return this.campaignsService.getCampaigns(undefined);
    }

    @Get()
    @ApiTags('Campaign')
    async getCampaigns(@Query('owner') owner: string): Promise<Campaign[]> {
        return this.campaignsService.getCampaigns(owner);
    }

    @Get(':campaignId/projects')
    @ApiTags('Campaign')
    async getProjects(
        @Param('campaignId', ParseIntPipe) campaignId: number,
    ): Promise<any> {
        return this.campaignsService.getProjects(campaignId);
    }

    @Get(':campaignId/projects/not-participated')
    @ApiTags('Campaign')
    async getProjectsNotParticipated(
        @Param('campaignId', ParseIntPipe) campaignId: number,
        @Query('projectOwner') projectOwner: string,
    ): Promise<number[]> {
        return this.campaignsService.getProjectsNotParticipated(
            campaignId,
            projectOwner,
        );
    }

    @Get(':campaignId/fundings/')
    @ApiTags('Campaign')
    async getFundings(
        @Param('campaignId', ParseIntPipe) campaignId: number,
    ): Promise<number[]> {
        return this.campaignsService.getFundings(campaignId);
    }

    @Get(':campaignId')
    @ApiTags('Campaign')
    async getCampaign(
        @Param('campaignId', ParseIntPipe) campaignId: number,
    ): Promise<Campaign> {
        return this.campaignsService.getCampaign(campaignId);
    }
}
