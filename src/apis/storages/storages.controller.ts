import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { StoragesService } from './storages.service';
import { ApiTags } from '@nestjs/swagger';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';

@Controller('storages')
export class StoragesController {
    constructor(private readonly storagesService: StoragesService) {}

    @Get('committee/member/level1')
    @ApiTags('Storage Committee')
    getMemberTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getMemberTreeLevel1();
    }

    @Get('committee/member/level2/:level1Index')
    @ApiTags('Storage Committee')
    getMemberTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getMemberTreeLevel2(level1Index);
    }

    @Get('committee/setting/level1')
    @ApiTags('Storage Committee')
    getSettingTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getSettingTreeLevel1();
    }

    @Get('dkg/zkapps')
    @ApiTags('Storage DKG')
    getDKGZkApps(): MerkleLeaf[] {
        return this.storagesService.getDKGZkAppTree();
    }

    @Get('dkg/key-counter/level1')
    @ApiTags('Storage DKG')
    getKeyCounterTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyCounterTreeLevel1();
    }

    @Get('dkg/key-status/level1')
    @ApiTags('Storage DKG')
    getKeyStatusTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyStatusTreeLevel1();
    }

    @Get('round1/zkapps')
    @ApiTags('Storage Round1')
    getRound1ZkApps(): MerkleLeaf[] {
        return this.storagesService.getRound1ZkAppTree();
    }

    @Get('round1/reduce')
    @ApiTags('Storage Round1')
    getRound1ReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRound1ReduceTree();
    }

    @Get('round1/contribution/level1')
    @ApiTags('Storage Round1')
    getRound1ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1ContributionTreeLevel1();
    }

    @Get('round1/contribution/level2/:level1Index')
    @ApiTags('Storage Round1')
    getRound1ContributionTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound1ContributionTreeLevel2(
            level1Index,
        );
    }

    @Get('round1/public-key/level1')
    @ApiTags('Storage Round1')
    getRound1PublicKeyTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1PublicKeyTreeLevel1();
    }

    @Get('round1/public-key/level2/:level1Index')
    @ApiTags('Storage Round1')
    getRound1PublicKeyTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound1PublickeyTreeLevel2(level1Index);
    }

    @Get('round2/zkapps')
    @ApiTags('Storage Round2')
    getRound2ZkApps(): MerkleLeaf[] {
        return this.storagesService.getRound2ZkAppTree();
    }

    @Get('round2/reduce')
    @ApiTags('Storage Round2')
    getRound2ReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRound2ReduceTree();
    }

    @Get('round2/contribution/level1')
    @ApiTags('Storage Round2')
    getRound2ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2ContributionTreeLevel1();
    }

    @Get('round2/contribution/level2/:level1Index')
    @ApiTags('Storage Round2')
    getRound2ContributionTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound2ContributionTreeLevel2(
            level1Index,
        );
    }

    @Get('round2/encryption/level1')
    @ApiTags('Storage Round2')
    getRound2EncryptionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2EncryptionTreeLevel1();
    }

    @Get('round2/encryption/level2/:level1Index')
    @ApiTags('Storage Round2')
    getRound2EncryptionTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound2EncryptionTreeLevel2(level1Index);
    }

    @Get('request/requester/level1')
    @ApiTags('Storage Request')
    getRequesterTreeLevel1(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRequesterTreeLevel1();
    }

    @Get('request/requester/leaves/level1')
    @ApiTags('Storage Request')
    getRequesterLeavesLevel1(): { [key: string]: string } {
        return this.storagesService.getRequesterLeavesLevel1();
    }

    @Get('request/request-status/level1')
    @ApiTags('Storage Request')
    getRequestStatusTreeLevel1(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRequestStatusTreeLevel1();
    }

    @Get('request/request-status/leaves/level1')
    @ApiTags('Storage Request')
    getRequestStatusLeavesLevel1(): { [key: string]: string } {
        return this.storagesService.getRequestStatusLeavesLevel1();
    }

    @Get('response/zkapps')
    @ApiTags('Storage Response')
    getResponseZkApps(): MerkleLeaf[] {
        return this.storagesService.getResponseZkApTree();
    }

    @Get('response/reduce')
    @ApiTags('Storage Response')
    getResponseReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getResponseReduceTree();
    }

    @Get('response/contribution/level1')
    @ApiTags('Storage Response')
    getResponseContributionTreeLevel1(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getResponseContributionTreeLevel1();
    }

    @Get('response/contribution/level2/:level1Index')
    @ApiTags('Storage Response')
    getResponseContributionTreeLevel2(
        @Param('level1Index') level1Index: string,
    ): MerkleLeaf[] {
        return this.storagesService.getResponseContributionTreeLevel2(
            level1Index,
        );
    }

    @Get('campaign/info/level1')
    @ApiTags('Storage Campaign')
    getCampaignInfoTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignInfoTreeLevel1();
    }

    @Get('campaign/owner/level1')
    @ApiTags('Storage Campaign')
    getCampaignOwnerTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignOwnerTreeLevel1();
    }

    @Get('campaign/status/level1')
    @ApiTags('Storage Campaign')
    getCampaignStatusTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignStatusTreeLevel1();
    }

    @Get('campaign/config/level1')
    @ApiTags('Storage Campaign')
    getCampaignConfigTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignConfigTreeLevel1();
    }

    @Get('campaign/zkapps')
    @ApiTags('Storage Campaign')
    getCampaignZkApps(): MerkleLeaf[] {
        return this.storagesService.getCampaignZkAppTree();
    }

    @Get('participation/counter/level1')
    @ApiTags('Storage Participation')
    getParticipationCounterTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationCounterTreeLevel1();
    }

    @Get('participation/index/level1')
    @ApiTags('Storage Participation')
    getParticipationIndexTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationIndexTreeLevel1();
    }

    @Get('participation/info/level1')
    @ApiTags('Storage Participation')
    getParticipationInfoTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationInfoTreeLevel1();
    }

    @Get('participation/zkapps')
    @ApiTags('Storage Participation')
    getParticipationZkApps(): MerkleLeaf[] {
        return this.storagesService.getParticipationZkAppTree();
    }

    @Get('project/info/level1')
    @ApiTags('Storage Project')
    getProjectInfoTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectInfoTreeLevel1();
    }

    @Get('project/address/level1')
    @ApiTags('Storage Project')
    getProjectAddressTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectAddressTreeLevel1();
    }

    @Get('project/member/level1')
    @ApiTags('Storage Project')
    getProjectMemberTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectMemberTreeLevel1();
    }

    @Get('project/member/level2/:level1Index')
    @ApiTags('Storage Project')
    getProjectMemberTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ): MerkleLeaf[] {
        return this.storagesService.getProjectMemberTreeLevel2(level1Index);
    }

    @Get('funding/total-m/level1')
    @ApiTags('Storage Funding')
    getFundingTotalMTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getFundingTotalMTreeLevel1();
    }

    @Get('funding/total-r/level1')
    @ApiTags('Storage Funding')
    getFundingTotalRTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getFundingTotalRTreeLevel1();
    }

    @Get('funding/request-id/level1')
    @ApiTags('Storage Funding')
    getFundingRequestIdTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getFundingRequestIdTreeLevel1();
    }

    @Get('funding/zkapps')
    @ApiTags('Storage Funding')
    getFundingZkApps(): MerkleLeaf[] {
        return this.storagesService.getFundingZkAppTree();
    }

    @Get('treasury/claimed/level1')
    @ApiTags('Storage Treasury')
    getTreasuryClaimedTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getTreasuryClaimedTreeLevel1();
    }

    @Get('treasury/zkapps')
    @ApiTags('Storage Treasury')
    getTreasuryZkApps(): MerkleLeaf[] {
        return this.storagesService.getTreasuryZkAppTree();
    }
}
