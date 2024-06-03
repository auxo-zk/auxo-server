import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { StoragesService } from './storages.service';
import { ApiTags } from '@nestjs/swagger';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';
import { Constants } from '@auxo-dev/dkg';

@Controller('storages')
export class StoragesController {
    constructor(private readonly storagesService: StoragesService) {}

    @Get('rollup/zkapp')
    @ApiTags('Storage Rollup')
    getRollupZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getRollupZkAppStorage();
    }

    @Get('rollup/zkapp/leafs')
    @ApiTags('Storage Rollup')
    getRollupZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRollupZkAppStorageLeafs();
    }

    @Get('rollup/counter/level1')
    @ApiTags('Storage Rollup')
    getRollupCounterStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRollupCounterStorageLevel1();
    }

    @Get('rollup/counter/leafs')
    @ApiTags('Storage Rollup')
    getRollupCounterStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRollupCounterStorageLeafs();
    }

    @Get('rollup/rollup/level1')
    @ApiTags('Storage Rollup')
    getRollupStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRollupStorageLevel1();
    }

    @Get('rollup/rollup/leafs')
    @ApiTags('Storage Rollup')
    getRollupStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRollupStorageLeafs();
    }

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

    @Get('dkg/zkapp/leafs')
    @ApiTags('Storage DKG')
    getDkgZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getDkgZkAppStorageLeafs();
    }

    @Get('dkg/key-counter/level1')
    @ApiTags('Storage DKG')
    getKeyCounterStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyCounterStorageLevel1();
    }

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

    @Get('dkg/process/level1')
    @ApiTags('Storage DKG')
    getProcessStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getProcessStorageLevel1();
    }

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

    @Get('round1/process/level1')
    @ApiTags('Storage Round1')
    getRound1ProcessStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1ProcessStorageLevel1();
    }

    @Get('round1/process/leafs')
    @ApiTags('Storage Round1')
    getRound1ProcessStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRound1ProcessStorageLeafs();
    }

    @Get('round2/zkapp')
    @ApiTags('Storage Round2')
    getRound2ZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getRound2ZkAppStorage();
    }

    @Get('round2/zkapp/leafs')
    @ApiTags('Storage Round2')
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

    @Get('round2/process/level1')
    @ApiTags('Storage Round2')
    getRound2ProcessStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2ProcessStorageLevel1();
    }

    @Get('round2/process/leafs')
    @ApiTags('Storage Round2')
    getRound2ProcessStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getRound2ProcessStorageLeafs();
    }

    @Get('request/zkapp')
    @ApiTags('Storage Request')
    getRequestZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getRequestZkAppStorage();
    }

    @Get('request/zkapp/leafs')
    @ApiTags('Storage Request')
    getRequestZkAppStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRequestZkAppStorageLeafs();
    }

    @Get('request/keyIndex/level1')
    @ApiTags('Storage Response')
    getRequestKeyIndexStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRequestKeyIndexStorageLevel1();
    }

    @Get('request/keyIndex/leafs')
    @ApiTags('Storage Response')
    getRequestKeyIndexStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRequestKeyIndexStorageLeafs();
    }

    @Get('request/task/level1')
    @ApiTags('Storage Response')
    getRequestTaskStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRequestTaskStorageLevel1();
    }

    @Get('request/task/leafs')
    @ApiTags('Storage Response')
    getRequestTaskStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRequestTaskStorageLeafs();
    }

    @Get('request/accumulation/level1')
    @ApiTags('Storage Response')
    getRequestAccumulationStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRequestAccumulationStorageLevel1();
    }

    @Get('request/accumulation/leafs')
    @ApiTags('Storage Response')
    getRequestAccumulationStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRequestAccumulationStorageLeafs();
    }

    @Get('request/expiration/level1')
    @ApiTags('Storage Response')
    getRequestExpirationStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRequestExpirationStorageLevel1();
    }

    @Get('request/expiration/leafs')
    @ApiTags('Storage Response')
    getRequestExpirationStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRequestExpirationStorageLeafs();
    }

    @Get('request/result/level1')
    @ApiTags('Storage Response')
    getRequestResultStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getRequestResultStorageLevel1();
    }

    @Get('request/result/leafs')
    @ApiTags('Storage Response')
    getRequestResultStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getRequestResultStorageLeafs();
    }

    @Get('response/zkapp')
    @ApiTags('Storage Response')
    getResponseZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getResponseZkAppStorage();
    }

    @Get('response/zkapp/leafs')
    @ApiTags('Storage Response')
    getResponseZkAppStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getResponseZkAppStorageLeafs();
    }

    @Get('response/contribution/level1')
    @ApiTags('Storage Response')
    getResponseContributionStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getResponseContributionStorageLevel1();
    }

    @Get('response/contribution/leafs')
    @ApiTags('Storage Response')
    getResponseContributionStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getResponseContributionStorageLeafs();
    }

    @Get('response/response/level1')
    @ApiTags('Storage Response')
    getResponseResponseStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getResponseResponseStorageLevel1();
    }

    @Get('response/response/leafs')
    @ApiTags('Storage Response')
    getResponseResponseStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getResponseResponseStorageLeafs();
    }

    @Get('response/process/level1')
    @ApiTags('Storage Response')
    getResponseProcessStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getResponseProcessStorageLevel1();
    }

    @Get('response/process/leafs')
    @ApiTags('Storage Response')
    getResponseProcessStorageLeafs(): { [key: string]: any } {
        return this.storagesService.getResponseProcessStorageLeafs();
    }

    @Get('requester/:requesterAddress/zkapp')
    @ApiTags('Storage Requester')
    getRequesterZkAppStorage(
        @Param('requesterAddress') requesterAddress: string,
    ): MerkleLeaf[] {
        return this.storagesService.getRequesterZkAppStorage(requesterAddress);
    }

    @Get('requester/:requesterAddress/zkapp/leafs')
    @ApiTags('Storage Requester')
    getRequesterZkAppStorageLeafs(
        @Param('requesterAddress') requesterAddress: string,
    ): { [key: string]: any } {
        return this.storagesService.getRequesterZkAppStorageLeafs(
            requesterAddress,
        );
    }

    @Get('requester/:requesterAddress/keyIndex/level1')
    @ApiTags('Storage Requester')
    getRequesterKeyIndexStorageLevel1(
        @Param('requesterAddress') requesterAddress: string,
    ): MerkleLeaf[] {
        return this.storagesService.getRequesterKeyIndexStorageLevel1(
            requesterAddress,
        );
    }

    @Get('requester/:requesterAddress/keyIndex/leafs')
    @ApiTags('Storage Requester')
    getRequesterKeyIndexStorageLeafs(
        @Param('requesterAddress') requesterAddress: string,
    ): { [key: string]: any } {
        return this.storagesService.getRequesterKeyIndexStorageLeafs(
            requesterAddress,
        );
    }

    @Get('requester/:requesterAddress/timestamp/level1')
    @ApiTags('Storage Requester')
    getRequesterTimestampStorageLevel1(
        @Param('requesterAddress') requesterAddress: string,
    ): MerkleLeaf[] {
        return this.storagesService.getRequesterTimestampStorageLevel1(
            requesterAddress,
        );
    }

    @Get('requester/:requesterAddress/timestamp/leafs')
    @ApiTags('Storage Requester')
    getRequesterTimestampStorageLeafs(
        @Param('requesterAddress') requesterAddress: string,
    ): { [key: string]: any } {
        return this.storagesService.getRequesterTimestampStorageLeafs(
            requesterAddress,
        );
    }

    @Get('requester/:requesterAddress/accumulation/level1')
    @ApiTags('Storage Requester')
    getRequesterAccumulationStorageLevel1(
        @Param('requesterAddress') requesterAddress: string,
    ): MerkleLeaf[] {
        return this.storagesService.getRequesterAccumulationStorageLevel1(
            requesterAddress,
        );
    }

    @Get('requester/:requesterAddress/accumulation/leafs')
    @ApiTags('Storage Requester')
    getRequesterAccumulationStorageLeafs(
        @Param('requesterAddress') requesterAddress: string,
    ): { [key: string]: any } {
        return this.storagesService.getRequesterAccumulationStorageLeafs(
            requesterAddress,
        );
    }

    @Get('requester/:requesterAddress/commitment/level1')
    @ApiTags('Storage Requester')
    getRequesterCommitmentStorageLevel1(
        @Param('requesterAddress') requesterAddress: string,
    ): MerkleLeaf[] {
        return this.storagesService.getRequesterCommitmentStorageLevel1(
            requesterAddress,
        );
    }

    @Get('requester/:requesterAddress/commitment/leafs')
    @ApiTags('Storage Requester')
    getRequesterCommitmentStorageLeafs(
        @Param('requesterAddress') requesterAddress: string,
    ): { [key: string]: any } {
        return this.storagesService.getRequesterCommitmentStorageLeafs(
            requesterAddress,
        );
    }

    @Get('project/member/level1')
    @ApiTags('Storage Project')
    getProjectMemberStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectMemberStorageLevel1();
    }

    @Get('project/member/leafs')
    @ApiTags('Storage Project')
    getProjectMemberStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getProjectMemberStorageLeafs();
    }

    @Get('project/ipfs-hash/level1')
    @ApiTags('Storage Project')
    getProjectIpfsHashStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectIpfsHashStorageLevel1();
    }

    @Get('project/ipfs-hash/leafs')
    @ApiTags('Storage Project')
    getProjectIpfsHashStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getProjectIpfsHashStorageLeafs();
    }

    @Get('project/treasury-address/level1')
    @ApiTags('Storage Project')
    getProjectTreasuryAddressStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getProjectTreasuryAddressStorageLevel1();
    }

    @Get('project/treasury-address/leafs')
    @ApiTags('Storage Project')
    getProjectTreasuryAddressStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getProjectTreasuryAddressStorageLeafs();
    }

    @Get('campaign/timeline/level1')
    @ApiTags('Storage Campaign')
    getCampaignTimelineStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignTimelineStorageLevel1();
    }

    @Get('campaign/timeline/leafs')
    @ApiTags('Storage Campaign')
    getCampaignTimelineStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getCampaignTimelineStorageLeafs();
    }

    @Get('campaign/ipfs-hash/level1')
    @ApiTags('Storage Campaign')
    getCampaignIpfsHashStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignIpfsHashStorageLevel1();
    }

    @Get('campaign/ipfs-hash/leafs')
    @ApiTags('Storage Campaign')
    getCampaignIpfsHashStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getCampaignIpfsHashStorageLeafs();
    }

    @Get('campaign/key-index/level1')
    @ApiTags('Storage Campaign')
    getCampaignKeyIndexStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getCampaignKeyIndexStorageLevel1();
    }

    @Get('campaign/key-index/leafs')
    @ApiTags('Storage Campaign')
    getCampaignKeyIndexStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getCampaignKeyIndexStorageLeafs();
    }

    @Get('campaign/zkapp')
    @ApiTags('Storage Campaign')
    getCampaignZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getCampaignZkAppStorage();
    }

    @Get('campaign/zkapp/leafs')
    @ApiTags('Storage Campaign')
    getCampaignZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getCampaignZkAppStorageLeafs();
    }

    @Get('participation/project-index/level1')
    @ApiTags('Storage Participation')
    getParticipationProjectIndexStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationProjectIndexStorageLevel1();
    }

    @Get('participation/project-index/leafs')
    @ApiTags('Storage Participation')
    getParticipationProjectIndexStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getParticipationProjectIndexStorageLeafs();
    }

    @Get('participation/project-counter/level1')
    @ApiTags('Storage Participation')
    getParticipationProjectCounterStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationProjectCounterStorageLevel1();
    }

    @Get('participation/project-counter/leafs')
    @ApiTags('Storage Participation')
    getParticipationProjectCounterStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getParticipationProjectCounterStorageLeafs();
    }

    @Get('participation/ipfs-hash/level1')
    @ApiTags('Storage Participation')
    getParticipationIpfsHashStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getParticipationIpfsHashStorageLevel1();
    }

    @Get('participation/ipfs-hash/leafs')
    @ApiTags('Storage Participation')
    getParticipationIpfsHashStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getParticipationIpfsHashStorageLeafs();
    }

    @Get('participation/zkapp')
    @ApiTags('Storage Participation')
    getParticipationZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getParticipationZkAppStorage();
    }

    @Get('participation/zkapp/leafs')
    @ApiTags('Storage Participation')
    getParticipationZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getParticipationZkAppStorageLeafs();
    }

    @Get('funding/information/level1')
    @ApiTags('Storage Funding')
    getFundingInformationStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getFundingInformationStorageLevel1();
    }

    @Get('funding/information/leafs')
    @ApiTags('Storage Funding')
    getFundingInformationStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getFundingInformationStorageLeafs();
    }

    @Get('funding/zkapp')
    @ApiTags('Storage Funding')
    getFundingZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getFundingZkAppStorage();
    }

    @Get('funding/zkapp/leafs')
    @ApiTags('Storage Funding')
    getFundingZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getFundingZkAppStorageLeafs();
    }

    @Get('treasury-manager/campaign-state/level1')
    @ApiTags('Storage Treasury Manager')
    getTreasuryManagerCampaignStateStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getTreasuryManagerCampaignStateStorageLevel1();
    }

    @Get('treasury-manager/campaign-state/leafs')
    @ApiTags('Storage Treasury Manager')
    getTreasuryManagerCampaignStateStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getTreasuryManagerCampaignStateStorageLeafs();
    }

    @Get('treasury-manager/claimed-amount/level1')
    @ApiTags('Storage Treasury Manager')
    getTreasuryManagerClaimedAmountStorageLevel1(): MerkleLeaf[] {
        return this.storagesService.getTreasuryManagerClaimedAmountStorageLevel1();
    }

    @Get('treasury-manager/claimed-amount/leafs')
    @ApiTags('Storage Treasury Manager')
    getTreasuryManagerClaimedAmountStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getTreasuryManagerClaimedAmountStorageLeafs();
    }

    @Get('treasury-manager/zkapp')
    @ApiTags('Storage Treasury Manager')
    getTreasuryManagerZkAppStorage(): MerkleLeaf[] {
        return this.storagesService.getTreasuryManagerZkAppStorage();
    }

    @Get('treasury-manager/zkapp/leafs')
    @ApiTags('Storage Treasury Manager')
    getTreasuryManagerZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.storagesService.getTreasuryManagerZkAppStorageLeafs();
    }
}
