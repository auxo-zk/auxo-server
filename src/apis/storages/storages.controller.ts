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

    @Get('committee/member/leafs')
    @ApiTags('Storage Committee')
    getMemberTreeLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getMemberTreeLeafs();
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

    @Get('committee/setting/leafs')
    @ApiTags('Storage Committee')
    getSettingTreeLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getSettingTreeLeafs();
    }

    @Get('dkg/zkapps')
    @ApiTags('Storage DKG')
    getDkgZkApps(): MerkleLeaf[] {
        return this.storagesService.getDkgZkAppTree();
    }

    @Get('dkg/zkapps/leafs')
    @ApiTags('Storage DKG')
    getDkgZkAppTreeLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getDkgZkAppTreeLeafs();
    }

    @Get('dkg/key-counter/level1')
    @ApiTags('Storage DKG')
    getKeyCounterTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyCounterTreeLevel1();
    }

    @Get('dkg/key-counter/leafs')
    @ApiTags('Storage DKG')
    getKeyCounterTreeLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getKeyCounterTreeLeafs();
    }

    @Get('dkg/key-status/level1')
    @ApiTags('Storage DKG')
    getKeyStatusTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyStatusTreeLevel1();
    }

    @Get('dkg/key-status/leafs')
    @ApiTags('Storage DKG')
    getKeyStatusTreeLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getKeyStatusTreeLeafs();
    }

    @Get('round1/zkapps')
    @ApiTags('Storage Round1')
    getRound1ZkApps(): MerkleLeaf[] {
        return this.storagesService.getRound1ZkAppTree();
    }

    @Get('round1/zkapps/leafs')
    @ApiTags('Storage Round1')
    getRound1ZkAppTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getRound1ZkAppTreeLeafs();
    }

    @Get('round1/reduce')
    @ApiTags('Storage Round1')
    getRound1ReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRound1ReduceTree();
    }

    @Get('round1/reduce/leafs')
    @ApiTags('Storage Round1')
    getRound1ReduceTreeLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRound1ReduceTreeLeafs();
    }

    @Get('round1/contribution/level1')
    @ApiTags('Storage Round1')
    getRound1ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1ContributionTreeLevel1();
    }

    @Get('round1/contribution/leafs')
    @ApiTags('Storage Round1')
    getRound1ContributionTreeLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRound1ContributionTreeLeafs();
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

    @Get('round1/public-key/leafs')
    @ApiTags('Storage Round1')
    getRound1PublicKeyTreeLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRound1PublicKeyTreeLeafs();
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

    @Get('round2/zkapps/leafs')
    @ApiTags('Storage Round2')
    getRound2ZkAppTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getRound2ZkAppTreeLeafs();
    }

    @Get('round2/reduce')
    @ApiTags('Storage Round2')
    getRound2ReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRound2ReduceTree();
    }

    @Get('round2/reduce/leafs')
    @ApiTags('Storage Round2')
    getRound2ReduceTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getRound2ReduceTreeLeafs();
    }

    @Get('round2/contribution/level1')
    @ApiTags('Storage Round2')
    getRound2ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2ContributionTreeLevel1();
    }

    @Get('round2/contribution/leafs')
    @ApiTags('Storage Round2')
    getRound2ContributionTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getRound2ContributionTreeLeafs();
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

    @Get('round2/encryption/leafs')
    @ApiTags('Storage Round2')
    getRound2EncryptionTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getRound2EncryptionTreeLeafs();
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

    @Get('request/requester/leafs')
    @ApiTags('Storage Request')
    getRequesterTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getRequesterTreeLeafs();
    }

    @Get('request/request-status/level1')
    @ApiTags('Storage Request')
    getRequestStatusTreeLevel1(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getRequestStatusTreeLevel1();
    }

    @Get('request/request-status/leafs')
    @ApiTags('Storage Request')
    getRequestStatusTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getRequestStatusTreeLeafs();
    }

    @Get('response/zkapps')
    @ApiTags('Storage Response')
    getResponseZkApps(): MerkleLeaf[] {
        return this.storagesService.getResponseZkAppTree();
    }

    @Get('response/zkapps/leafs')
    @ApiTags('Storage Response')
    getResponseZkAppsLeafs(): { [key: string]: any } {
        return this.storagesService.getResponseZkAppTreeLeafs();
    }

    @Get('response/reduce')
    @ApiTags('Storage Response')
    getResponseReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getResponseReduceTree();
    }

    @Get('response/reduce/leafs')
    @ApiTags('Storage Response')
    getResponseReduceTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getResponseReduceTreeLeafs();
    }

    @Get('response/contribution/level1')
    @ApiTags('Storage Response')
    getResponseContributionTreeLevel1(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getResponseContributionTreeLevel1();
    }

    @Get('response/contribution/leafs')
    @ApiTags('Storage Response')
    getResponseContributionTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getResponseContributionTreeLeafs();
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

    @Get('campaign/info/leafs')
    @ApiTags('Storage Campaign')
    getCampaignInfoTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getCampaignInfoTreeLeafs();
    }

    @Get('campaign/owner/level1')
    @ApiTags('Storage Campaign')
    getCampaignOwnerTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignOwnerTreeLevel1();
    }

    @Get('campaign/owner/leafs')
    @ApiTags('Storage Campaign')
    getCampaignOwnerTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getCampaignOwnerTreeLeafs();
    }

    @Get('campaign/status/level1')
    @ApiTags('Storage Campaign')
    getCampaignStatusTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignStatusTreeLevel1();
    }

    @Get('campaign/status/leafs')
    @ApiTags('Storage Campaign')
    getCampaignStatusTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getCampaignStatusTreeLeafs();
    }

    @Get('campaign/config/level1')
    @ApiTags('Storage Campaign')
    getCampaignConfigTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignConfigTreeLevel1();
    }

    @Get('campaign/config/leafs')
    @ApiTags('Storage Campaign')
    getCampaignConfigTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getCampaignConfigTreeLeafs();
    }

    @Get('campaign/zkapps')
    @ApiTags('Storage Campaign')
    getCampaignZkApps(): MerkleLeaf[] {
        return this.storagesService.getCampaignZkAppTree();
    }

    @Get('campaign/zkapps/leafs')
    @ApiTags('Storage Campaign')
    getCampaignZkAppsLeafs(): { [key: string]: any } {
        return this.storagesService.getCampaignZkAppTreeLeafs();
    }

    @Get('participation/counter/level1')
    @ApiTags('Storage Participation')
    getParticipationCounterTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationCounterTreeLevel1();
    }

    @Get('participation/counter/leafs')
    @ApiTags('Storage Participation')
    getParticipationCounterTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getParticipationCounterTreeLeafs();
    }

    @Get('participation/index/level1')
    @ApiTags('Storage Participation')
    getParticipationIndexTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationIndexTreeLevel1();
    }

    @Get('participation/index/leafs')
    @ApiTags('Storage Participation')
    getParticipationIndexTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getParticipationIndexTreeLeafs();
    }

    @Get('participation/info/level1')
    @ApiTags('Storage Participation')
    getParticipationInfoTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationInfoTreeLevel1();
    }

    @Get('participation/info/leafs')
    @ApiTags('Storage Participation')
    getParticipationInfoTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getParticipationInfoTreeLeafs();
    }

    @Get('participation/zkapps')
    @ApiTags('Storage Participation')
    getParticipationZkApps(): MerkleLeaf[] {
        return this.storagesService.getParticipationZkAppTree();
    }

    @Get('participation/zkapps/leafs')
    @ApiTags('Storage Participation')
    getParticipationZkAppsLeafs(): { [key: string]: any } {
        return this.storagesService.getParticipationZkAppTreeLeafs();
    }

    @Get('project/info/level1')
    @ApiTags('Storage Project')
    getProjectInfoTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectInfoTreeLevel1();
    }

    @Get('project/info/leafs')
    @ApiTags('Storage Project')
    getProjectInfoTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getProjectInfoTreeLeafs();
    }

    @Get('project/payee/level1')
    @ApiTags('Storage Project')
    getProjectPayeeTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectPayeeTreeLevel1();
    }

    @Get('project/address/leafs')
    @ApiTags('Storage Project')
    getProjectAddressTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getProjectPayeeTreeLeafs();
    }

    @Get('project/member/level1')
    @ApiTags('Storage Project')
    getProjectMemberTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectMemberTreeLevel1();
    }

    @Get('project/member/leafs')
    @ApiTags('Storage Project')
    getProjectMemberTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getProjectMemberTreeLeafs();
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

    @Get('funding/total-m/leafs')
    @ApiTags('Storage Funding')
    getFundingTotalMTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getFundingTotalMTreeLeafs();
    }

    @Get('funding/total-r/level1')
    @ApiTags('Storage Funding')
    getFundingTotalRTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getFundingTotalRTreeLevel1();
    }

    @Get('funding/total-r/leafs')
    @ApiTags('Storage Funding')
    getFundingTotalRTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getFundingTotalRTreeLeafs();
    }

    @Get('funding/request-id/level1')
    @ApiTags('Storage Funding')
    getFundingRequestIdTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getFundingRequestIdTreeLevel1();
    }

    @Get('funding/request-id/leafs')
    @ApiTags('Storage Funding')
    getFundingRequestIdTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getFundingRequestIdTreeLeafs();
    }

    @Get('funding/zkapps')
    @ApiTags('Storage Funding')
    getFundingZkApps(): MerkleLeaf[] {
        return this.storagesService.getFundingZkAppTree();
    }

    @Get('funding/zkapps/leafs')
    @ApiTags('Storage Funding')
    getFundingZkAppsLeafs(): { [key: string]: any } {
        return this.storagesService.getFundingZkAppTreeLeafs();
    }

    @Get('funding/reduce')
    @ApiTags('Storage Funding')
    getFundingReduceTree(): { [key: string]: MerkleLeaf } {
        return this.storagesService.getFundingReduceTree();
    }

    @Get('funding/reduce/leafs')
    @ApiTags('Storage Funding')
    getFundingReduceTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getFundingReduceTreeLeafs();
    }

    @Get('treasury/claimed/level1')
    @ApiTags('Storage Treasury')
    getTreasuryClaimedTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getTreasuryClaimedTreeLevel1();
    }

    @Get('treasury/claimed/leafs')
    @ApiTags('Storage Treasury')
    getTreasuryClaimedTreeLeafs(): { [key: string]: any } {
        return this.storagesService.getTreasuryClaimedTreeLeafs();
    }

    @Get('treasury/zkapps')
    @ApiTags('Storage Treasury')
    getTreasuryZkApps(): MerkleLeaf[] {
        return this.storagesService.getTreasuryZkAppTree();
    }

    @Get('treasury/zkapps/leafs')
    @ApiTags('Storage Treasury')
    getTreasuryZkAppsLeafs(): { [key: string]: any } {
        return this.storagesService.getTreasuryZkAppTreeLeafs();
    }
}
