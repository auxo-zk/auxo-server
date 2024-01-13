import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { StoragesService } from './storages.service';
import { ApiTags } from '@nestjs/swagger';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';

@Controller('storages')
export class StoragesController {
    constructor(private readonly storagesService: StoragesService) {}

    @Get('committee/member/level1')
    @ApiTags('Storage')
    getMemberTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getMemberTreeLevel1();
    }

    @Get('committee/member/level2/:level1Index')
    @ApiTags('Storage')
    getMemberTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getMemberTreeLevel2(level1Index);
    }

    @Get('committee/setting/level1')
    @ApiTags('Storage')
    getSettingTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getSettingTreeLevel1();
    }

    @Get('dkg/zkapps')
    @ApiTags('Storage')
    getDKGZkApps(): MerkleLeaf[] {
        return this.storagesService.getDKGZkAppTree();
    }

    @Get('dkg/key-counter/level1')
    @ApiTags('Storage')
    getKeyCounterTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyCounterTreeLevel1();
    }

    @Get('dkg/key-status/level1')
    @ApiTags('Storage')
    getKeyStatusTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyStatusTreeLevel1();
    }

    @Get('round1/zkapps')
    @ApiTags('Storage')
    getRound1ZkApps(): MerkleLeaf[] {
        return this.storagesService.getRound1ZkAppTree();
    }

    @Get('round1/reduce')
    @ApiTags('Storage')
    getRound1ReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRound1ReduceTree();
    }

    @Get('round1/contribution/level1')
    @ApiTags('Storage')
    getRound1ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1ContributionTreeLevel1();
    }

    @Get('round1/contribution/level2/:level1Index')
    @ApiTags('Storage')
    getRound1ContributionTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound1ContributionTreeLevel2(
            level1Index,
        );
    }

    @Get('round1/public-key/level1')
    @ApiTags('Storage')
    getRound1PublicKeyTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1PublicKeyTreeLevel1();
    }

    @Get('round1/public-key/level2/:level1Index')
    @ApiTags('Storage')
    getRound1PublicKeyTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound1PublickeyTreeLevel2(level1Index);
    }

    @Get('round2/zkapps')
    @ApiTags('Storage')
    getRound2ZkApps(): MerkleLeaf[] {
        return this.storagesService.getRound2ZkAppTree();
    }

    @Get('round2/reduce')
    @ApiTags('Storage')
    getRound2ReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRound2ReduceTree();
    }

    @Get('round2/contribution/level1')
    @ApiTags('Storage')
    getRound2ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2ContributionTreeLevel1();
    }

    @Get('round2/contribution/level2/:level1Index')
    @ApiTags('Storage')
    getRound2ContributionTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound2ContributionTreeLevel2(
            level1Index,
        );
    }

    @Get('round2/encryption/level1')
    @ApiTags('Storage')
    getRound2EncryptionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2EncryptionTreeLevel1();
    }

    @Get('round2/encryption/level2/:level1Index')
    @ApiTags('Storage')
    getRound2EncryptionTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound2EncryptionTreeLevel2(level1Index);
    }

    @Get('request/requester/level1')
    @ApiTags('Storage')
    getRequesterTreeLevel1(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRequesterTreeLevel1();
    }

    @Get('request/request-status/level1')
    @ApiTags('Storage')
    getRequestStatusTreeLevel1(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRequestStatusTreeLevel1();
    }

    @Get('response/zkapps')
    @ApiTags('Storage')
    getResponseZkApps(): MerkleLeaf[] {
        return this.storagesService.getResponseZkApTree();
    }

    @Get('response/reduce')
    @ApiTags('Storage')
    getResponseReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getResponseReduceTree();
    }

    @Get('response/contribution/level1')
    @ApiTags('Storage')
    getResponseContributionTreeLevel1(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getResponseContributionTreeLevel1();
    }

    @Get('response/contribution/level2/:level1Index')
    @ApiTags('Storage')
    getResponseContributionTreeLevel2(
        @Param('level1Index') level1Index: string,
    ): MerkleLeaf[] {
        return this.storagesService.getResponseContributionTreeLevel2(
            level1Index,
        );
    }

    @Get('campaign/info/level1')
    @ApiTags('Storage')
    getCampaignInfoTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignInfoTreeLevel1();
    }

    @Get('campaign/owner/level1')
    @ApiTags('Storage')
    getCampaignOwnerTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignOwnerTreeLevel1();
    }

    @Get('campaign/status/level1')
    @ApiTags('Storage')
    getCampaignStatusTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignStatusTreeLevel1();
    }

    @Get('campaign/config/level1')
    @ApiTags('Storage')
    getCampaignConfigTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignConfigTreeLevel1();
    }

    @Get('campaign/zkapps')
    @ApiTags('Storage')
    getCampaignZkApps(): MerkleLeaf[] {
        return this.storagesService.getCampaignZkAppTree();
    }

    @Get('participation/counter/level1')
    @ApiTags('Storage')
    getParticipationCounterTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationCounterTreeLevel1();
    }

    @Get('participation/index/level1')
    @ApiTags('Storage')
    getParticipationIndexTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationIndexTreeLevel1();
    }

    @Get('participation/info/level1')
    @ApiTags('Storage')
    getParticipationInfoTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationInfoTreeLevel1();
    }

    @Get('participation/zkapps')
    @ApiTags('Storage')
    getParticipationZkApps(): MerkleLeaf[] {
        return this.storagesService.getParticipationZkAppTree();
    }

    @Get('project/info/level1')
    @ApiTags('Storage')
    getProjectInfoTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectInfoTreeLevel1();
    }

    @Get('project/address/level1')
    @ApiTags('Storage')
    getProjectAddressTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectAddressTreeLevel1();
    }

    @Get('project/member/level1')
    @ApiTags('Storage')
    getProjectMemberTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectMemberTreeLevel1();
    }

    @Get('project/member/level2:/:level1Index')
    @ApiTags('Storage')
    getProjectMemberTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ): MerkleLeaf[] {
        return this.storagesService.getProjectMemberTreeLevel2(level1Index);
    }

    @Get('funding/total-m/level1')
    @ApiTags('Storage')
    getFundingTotalMTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getFundingTotalMTreeLevel1();
    }

    @Get('funding/total-r/level1')
    @ApiTags('Storage')
    getFundingTotalRTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getFundingTotalRTreeLevel1();
    }

    @Get('funding/request-id/level1')
    @ApiTags('Storage')
    getFundingRequestIdTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getFundingRequestIdTreeLevel1();
    }

    @Get('funding/zkapps')
    @ApiTags('Storage')
    getFundingZkApps(): MerkleLeaf[] {
        return this.storagesService.getFundingZkAppTree();
    }

    @Get('treasury/claimed/level1')
    @ApiTags('Storage')
    getTreasuryClaimedTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getTreasuryClaimedTreeLevel1();
    }

    @Get('treasury/zkapps')
    @ApiTags('Storage')
    getTreasuryZkApps(): MerkleLeaf[] {
        return this.storagesService.getTreasuryZkAppTree();
    }
}
