import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { StoragesService } from './storages.service';
import { ApiTags } from '@nestjs/swagger';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';
import { Constants } from '@auxo-dev/dkg';

@Controller('storages')
export class StoragesController {
    constructor(private readonly storagesService: StoragesService) {}

    @Get('committee/zkapp')
    @ApiTags('Storage Committee')
    getCommitteeZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getCommitteeZkAppStorage();
    }

    @Get('committee/zkapp/leafs')
    @ApiTags('Storage Committee')
    getCommitteeZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getCommitteeZkAppStorageLeafs();
    }

    @Get('committee/member/level1')
    @ApiTags('Storage Committee')
    getMemberStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getMemberStorageLevel1();
    }

    @Get('committee/member/leafs')
    @ApiTags('Storage Committee')
    getMemberStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getMemberStorageLeafs();
    }

    @Get('committee/member/level2/:level1Index')
    @ApiTags('Storage Committee')
    getMemberStorageLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getMemberStorageLevel2(level1Index);
    }

    @Get('committee/setting/level1')
    @ApiTags('Storage Committee')
    getSettingStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getSettingStorageLevel1();
    }

    @Get('committee/setting/leafs')
    @ApiTags('Storage Committee')
    getSettingStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getSettingStorageLeafs();
    }

    @Get('dkg/zkapp')
    @ApiTags('Storage DKG')
    getDkgZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getDkgZkAppStorage();
    }

    @Get('dkg/zkapps/leafs')
    @ApiTags('Storage DKG')
    getDkgZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getDkgZkAppStorageLeafs();
    }

    // @Get('dkg/key-counter/level1')
    // @ApiTags('Storage DKG')
    // getKeyCounterStorageLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getKeyCounterStorageLevel1();
    // }

    @Get('dkg/key-counter/leafs')
    @ApiTags('Storage DKG')
    getKeyCounterStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getKeyCounterStorageLeafs();
    }

    @Get('dkg/key-status/level1')
    @ApiTags('Storage DKG')
    getKeyStatusStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyStatusStorageLevel1();
    }

    @Get('dkg/key-status/leafs')
    @ApiTags('Storage DKG')
    getKeyStatusStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getKeyStatusStorageLeafs();
    }

    @Get('dkg/key/level1')
    @ApiTags('Storage DKG')
    getKeyStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyStorageLevel1();
    }

    @Get('dkg/key/leafs')
    @ApiTags('Storage DKG')
    getKeyStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getKeyStorageLeafs();
    }

    // @Get('dkg/process/level1')
    // @ApiTags('Storage DKG')
    // getProcessStorageLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getProcessStorageLevel1();
    // }

    @Get('dkg/process/leafs')
    @ApiTags('Storage DKG')
    getProcessStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getProcessStorageLeafs();
    }

    @Get('round1/zkapp')
    @ApiTags('Storage Round1')
    getRound1ZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getRound1ZkAppStorage();
    }

    @Get('round1/zkapp/leafs')
    @ApiTags('Storage Round1')
    getRound1ZkAppStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRound1ZkAppStorageLeafs();
    }

    @Get('round1/contribution/level1')
    @ApiTags('Storage Round1')
    getRound1ContributionStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1ContributionStorageLevel1();
    }

    @Get('round1/contribution/leafs')
    @ApiTags('Storage Round1')
    getRound1ContributionStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRound1ContributionStorageLeafs();
    }

    @Get('round1/contribution/level2/:level1Index')
    @ApiTags('Storage Round1')
    getRound1ContributionStorageLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound1ContributionStorageLevel2(
            level1Index,
        );
    }

    @Get('round1/public-key/level1')
    @ApiTags('Storage Round1')
    getRound1PublicKeyStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1PublicKeyStorageLevel1();
    }

    @Get('round1/public-key/leafs')
    @ApiTags('Storage Round1')
    getRound1PublicKeyStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRound1PublicKeyStorageLeafs();
    }

    @Get('round1/public-key/level2/:level1Index')
    @ApiTags('Storage Round1')
    getRound1PublicKeyStorageLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound1PublicKeyStorageLevel2(
            level1Index,
        );
    }

    // @Get('round1/process/level1')
    // @ApiTags('Storage Round1')
    // getRound1ProcessStorageLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getRound1ProcessStorageLevel1();
    // }

    @Get('round1/public-key/leafs')
    @ApiTags('Storage Round1')
    getRound1ProcessStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRound1ProcessStorageLeafs();
    }

    @Get('round2/zkapp')
    @ApiTags('Storage Round1')
    getRound2ZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getRound2ZkAppStorage();
    }

    @Get('round2/zkapp/leafs')
    @ApiTags('Storage Round1')
    getRound2ZkAppStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRound2ZkAppStorageLeafs();
    }

    @Get('round2/contribution/level1')
    @ApiTags('Storage Round2')
    getRound2ContributionStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2ContributionStorageLevel1();
    }

    @Get('round2/contribution/leafs')
    @ApiTags('Storage Round2')
    getRound2ContributionStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRound2ContributionStorageLeafs();
    }

    @Get('round2/contribution/level2/:level1Index')
    @ApiTags('Storage Round2')
    getRound2ContributionStorageLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound2ContributionStorageLevel2(
            level1Index,
        );
    }

    @Get('round2/encryption/level1')
    @ApiTags('Storage Round2')
    getRound2EncryptionStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2EncryptionStorageLevel1();
    }

    @Get('round2/encryption/leafs')
    @ApiTags('Storage Round2')
    getRound2EncryptionStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRound2EncryptionStorageLeafs();
    }

    @Get('round2/encryption/level2/:level1Index')
    @ApiTags('Storage Round2')
    getRound2EncryptionStorageLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound2EncryptionStorageLevel2(
            level1Index,
        );
    }

    // @Get('request/requester/level1')
    // @ApiTags('Storage Request')
    // getRequesterTreeLevel1(): { [key: string]: MerkleLeaf } {
    //     return this.storagesService.getRequesterTreeLevel1();
    // }

    // @Get('request/requester/leafs')
    // @ApiTags('Storage Request')
    // getRequesterTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getRequesterTreeLeafs();
    // }

    // @Get('request/request-status/level1')
    // @ApiTags('Storage Request')
    // getRequestStatusTreeLevel1(): { [key: string]: MerkleLeaf } {
    //     return this.storagesService.getRequestStatusTreeLevel1();
    // }

    // @Get('request/request-status/leafs')
    // @ApiTags('Storage Request')
    // getRequestStatusTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getRequestStatusTreeLeafs();
    // }

    // @Get('response/zkapps')
    // @ApiTags('Storage Response')
    // getResponseZkApps(): MerkleLeaf[] {
    //     return this.storagesService.getResponseZkAppTree();
    // }

    // @Get('response/zkapps/leafs')
    // @ApiTags('Storage Response')
    // getResponseZkAppsLeafs(): { [key: string]: any } {
    //     return this.storagesService.getResponseZkAppTreeLeafs();
    // }

    // @Get('response/reduce')
    // @ApiTags('Storage Response')
    // getResponseReduceTree(): { [key: string]: MerkleLeaf } {
    //     return this.storagesService.getResponseReduceTree();
    // }

    // @Get('response/reduce/leafs')
    // @ApiTags('Storage Response')
    // getResponseReduceTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getResponseReduceTreeLeafs();
    // }

    // @Get('response/contribution/level1')
    // @ApiTags('Storage Response')
    // getResponseContributionTreeLevel1(): { [key: string]: MerkleLeaf } {
    //     return this.storagesService.getResponseContributionTreeLevel1();
    // }

    // @Get('response/contribution/leafs')
    // @ApiTags('Storage Response')
    // getResponseContributionTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getResponseContributionTreeLeafs();
    // }

    // @Get('response/contribution/level2/:level1Index')
    // @ApiTags('Storage Response')
    // getResponseContributionTreeLevel2(
    //     @Param('level1Index') level1Index: string,
    // ): MerkleLeaf[] {
    //     return this.storagesService.getResponseContributionTreeLevel2(
    //         level1Index,
    //     );
    // }

    // @Get('campaign/info/level1')
    // @ApiTags('Storage Campaign')
    // getCampaignInfoTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getCampaignInfoTreeLevel1();
    // }

    // @Get('campaign/info/leafs')
    // @ApiTags('Storage Campaign')
    // getCampaignInfoTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getCampaignInfoTreeLeafs();
    // }

    // @Get('campaign/owner/level1')
    // @ApiTags('Storage Campaign')
    // getCampaignOwnerTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getCampaignOwnerTreeLevel1();
    // }

    // @Get('campaign/owner/leafs')
    // @ApiTags('Storage Campaign')
    // getCampaignOwnerTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getCampaignOwnerTreeLeafs();
    // }

    // @Get('campaign/status/level1')
    // @ApiTags('Storage Campaign')
    // getCampaignStatusTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getCampaignStatusTreeLevel1();
    // }

    // @Get('campaign/status/leafs')
    // @ApiTags('Storage Campaign')
    // getCampaignStatusTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getCampaignStatusTreeLeafs();
    // }

    // @Get('campaign/config/level1')
    // @ApiTags('Storage Campaign')
    // getCampaignConfigTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getCampaignConfigTreeLevel1();
    // }

    // @Get('campaign/config/leafs')
    // @ApiTags('Storage Campaign')
    // getCampaignConfigTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getCampaignConfigTreeLeafs();
    // }

    // @Get('campaign/zkapps')
    // @ApiTags('Storage Campaign')
    // getCampaignZkApps(): MerkleLeaf[] {
    //     return this.storagesService.getCampaignZkAppTree();
    // }

    // @Get('campaign/zkapps/leafs')
    // @ApiTags('Storage Campaign')
    // getCampaignZkAppsLeafs(): { [key: string]: any } {
    //     return this.storagesService.getCampaignZkAppTreeLeafs();
    // }

    // @Get('participation/counter/level1')
    // @ApiTags('Storage Participation')
    // getParticipationCounterTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getParticipationCounterTreeLevel1();
    // }

    // @Get('participation/counter/leafs')
    // @ApiTags('Storage Participation')
    // getParticipationCounterTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getParticipationCounterTreeLeafs();
    // }

    // @Get('participation/index/level1')
    // @ApiTags('Storage Participation')
    // getParticipationIndexTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getParticipationIndexTreeLevel1();
    // }

    // @Get('participation/index/leafs')
    // @ApiTags('Storage Participation')
    // getParticipationIndexTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getParticipationIndexTreeLeafs();
    // }

    // @Get('participation/info/level1')
    // @ApiTags('Storage Participation')
    // getParticipationInfoTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getParticipationInfoTreeLevel1();
    // }

    // @Get('participation/info/leafs')
    // @ApiTags('Storage Participation')
    // getParticipationInfoTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getParticipationInfoTreeLeafs();
    // }

    // @Get('participation/zkapps')
    // @ApiTags('Storage Participation')
    // getParticipationZkApps(): MerkleLeaf[] {
    //     return this.storagesService.getParticipationZkAppTree();
    // }

    // @Get('participation/zkapps/leafs')
    // @ApiTags('Storage Participation')
    // getParticipationZkAppsLeafs(): { [key: string]: any } {
    //     return this.storagesService.getParticipationZkAppTreeLeafs();
    // }

    // @Get('project/info/level1')
    // @ApiTags('Storage Project')
    // getProjectInfoTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getProjectInfoTreeLevel1();
    // }

    // @Get('project/info/leafs')
    // @ApiTags('Storage Project')
    // getProjectInfoTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getProjectInfoTreeLeafs();
    // }

    // @Get('project/payee/level1')
    // @ApiTags('Storage Project')
    // getProjectPayeeTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getProjectPayeeTreeLevel1();
    // }

    // @Get('project/address/leafs')
    // @ApiTags('Storage Project')
    // getProjectAddressTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getProjectPayeeTreeLeafs();
    // }

    // @Get('project/member/level1')
    // @ApiTags('Storage Project')
    // getProjectMemberTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getProjectMemberTreeLevel1();
    // }

    // @Get('project/member/leafs')
    // @ApiTags('Storage Project')
    // getProjectMemberTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getProjectMemberTreeLeafs();
    // }

    // @Get('project/member/level2/:level1Index')
    // @ApiTags('Storage Project')
    // getProjectMemberTreeLevel2(
    //     @Param('level1Index', ParseIntPipe) level1Index: number,
    // ): MerkleLeaf[] {
    //     return this.storagesService.getProjectMemberTreeLevel2(level1Index);
    // }

    // @Get('funding/total-m/level1')
    // @ApiTags('Storage Funding')
    // getFundingTotalMTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getFundingTotalMTreeLevel1();
    // }

    // @Get('funding/total-m/leafs')
    // @ApiTags('Storage Funding')
    // getFundingTotalMTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getFundingTotalMTreeLeafs();
    // }

    // @Get('funding/total-r/level1')
    // @ApiTags('Storage Funding')
    // getFundingTotalRTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getFundingTotalRTreeLevel1();
    // }

    // @Get('funding/total-r/leafs')
    // @ApiTags('Storage Funding')
    // getFundingTotalRTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getFundingTotalRTreeLeafs();
    // }

    // @Get('funding/request-id/level1')
    // @ApiTags('Storage Funding')
    // getFundingRequestIdTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getFundingRequestIdTreeLevel1();
    // }

    // @Get('funding/request-id/leafs')
    // @ApiTags('Storage Funding')
    // getFundingRequestIdTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getFundingRequestIdTreeLeafs();
    // }

    // @Get('funding/zkapps')
    // @ApiTags('Storage Funding')
    // getFundingZkApps(): MerkleLeaf[] {
    //     return this.storagesService.getFundingZkAppTree();
    // }

    // @Get('funding/zkapps/leafs')
    // @ApiTags('Storage Funding')
    // getFundingZkAppsLeafs(): { [key: string]: any } {
    //     return this.storagesService.getFundingZkAppTreeLeafs();
    // }

    // @Get('funding/reduce')
    // @ApiTags('Storage Funding')
    // getFundingReduceTree(): { [key: string]: MerkleLeaf } {
    //     return this.storagesService.getFundingReduceTree();
    // }

    // @Get('funding/reduce/leafs')
    // @ApiTags('Storage Funding')
    // getFundingReduceTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getFundingReduceTreeLeafs();
    // }

    // @Get('treasury/claimed/level1')
    // @ApiTags('Storage Treasury')
    // getTreasuryClaimedTreeLevel1(): MerkleLeaf[] {
    //     return this.storagesService.getTreasuryClaimedTreeLevel1();
    // }

    // @Get('treasury/claimed/leafs')
    // @ApiTags('Storage Treasury')
    // getTreasuryClaimedTreeLeafs(): { [key: string]: any } {
    //     return this.storagesService.getTreasuryClaimedTreeLeafs();
    // }

    // @Get('treasury/zkapps')
    // @ApiTags('Storage Treasury')
    // getTreasuryZkApps(): MerkleLeaf[] {
    //     return this.storagesService.getTreasuryZkAppTree();
    // }

    // @Get('treasury/zkapps/leafs')
    // @ApiTags('Storage Treasury')
    // getTreasuryZkAppsLeafs(): { [key: string]: any } {
    //     return this.storagesService.getTreasuryZkAppTreeLeafs();
    // }
}
