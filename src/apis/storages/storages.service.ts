import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Field, Provable } from 'o1js';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';
import { CampaignContractService } from 'src/mina-contracts/campaign-contract/campaign-contract.service';
import { CommitteeContractService } from 'src/mina-contracts/committee-contract/committee-contract.service';
import { DkgContractsService } from 'src/mina-contracts/dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from 'src/mina-contracts/dkg-usage-contracts/dkg-usage-contracts.service';
import { FundingContractService } from 'src/mina-contracts/funding-contract/funding-contract.service';
import { ParticipationContractService } from 'src/mina-contracts/participation-contract/participation-contract.service';
import { ProjectContractService } from 'src/mina-contracts/project-contract/project-contract.service';
import { TreasuryManagerContractService } from 'src/mina-contracts/treasury-manager-contract/treasury-manager-contract.service';

@Injectable()
export class StoragesService {
    private readonly logger = new Logger(StoragesService.name);

    constructor(
        private readonly committeeContractsService: CommitteeContractService,
        private readonly dkgContractService: DkgContractsService,
        private readonly dkgUsageContractService: DkgUsageContractsService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly projectContractService: ProjectContractService,
        private readonly fundingContractService: FundingContractService,
        private readonly treasuryManagerContractService: TreasuryManagerContractService,
    ) {}

    // getMemberTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.committeeContractsService.memberTree.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.committeeContractsService.memberTree
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getMemberTreeLeafs(): {
    //     [key: string]: any;
    // } {
    //     return this.committeeContractsService.memberTree.leafs;
    // }

    // getMemberTreeLevel2(level1Index: number) {
    //     const result: MerkleLeaf[] = [];
    //     if (this.committeeContractsService.memberTree.level2s[level1Index]) {
    //         const leafCount =
    //             this.committeeContractsService.memberTree.level2s[level1Index]
    //                 .leafCount;
    //         for (let i = 0; i < leafCount; i++) {
    //             result.push(
    //                 this.committeeContractsService.memberTree
    //                     .getLevel2Witness(Field(level1Index), Field(i))
    //                     .toJSON(),
    //             );
    //         }
    //         return result;
    //     } else {
    //         throw new NotFoundException();
    //     }
    // }

    // getSettingTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.committeeContractsService.settingTree.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.committeeContractsService.settingTree
    //                 .getWitness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getSettingTreeLeafs(): {
    //     [key: string]: any;
    // } {
    //     return this.committeeContractsService.settingTree.leafs;
    // }

    // getDkgZkAppTree(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgContractService.dkg.zkApp.addressMap.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgContractService.dkg.zkApp.getWitness(Field(i)).toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getDkgZkAppTreeLeafs(): {
    //     [key: string]: any;
    // } {
    //     return this.dkgContractService.dkg.zkApp.addresses;
    // }

    // getKeyCounterTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgContractService.dkg.keyCounter.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgContractService.dkg.keyCounter
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getKeyCounterTreeLeafs(): {
    //     [key: string]: any;
    // } {
    //     return this.dkgContractService.dkg.keyCounter.leafs;
    // }

    // getKeyStatusTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgContractService.dkg.keyStatus.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgContractService.dkg.keyStatus
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getKeyStatusTreeLeafs(): {
    //     [key: string]: any;
    // } {
    //     return this.dkgContractService.dkg.keyStatus.leafs;
    // }

    // getRound1ZkAppTree(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgContractService.round1.zkApp.addressMap.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgContractService.round1.zkApp
    //                 .getWitness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getRound1ZkAppTreeLeafs(): { [key: string]: any } {
    //     return this.dkgContractService.round1.zkApp.addresses;
    // }

    // getRound1ReduceTree(): { [key: string]: MerkleLeaf } {
    //     const indexes = this.dkgContractService.round1.reducedActions;
    //     const result: { [key: string]: MerkleLeaf } = {};
    //     for (let i = 0; i < indexes.length; i++) {
    //         result[indexes[i].toString()] =
    //             this.dkgContractService.round1.reduceState
    //                 .getWitness(indexes[i])
    //                 .toJSON();
    //     }
    //     return result;
    // }

    // getRound1ReduceTreeLeafs(): {
    //     [key: string]: any;
    // } {
    //     return this.dkgContractService.round1.reduceState.actions;
    // }

    // getRound1ContributionTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgContractService.round1.contribution.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgContractService.round1.contribution
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getRound1ContributionTreeLeafs(): {
    //     [key: string]: any;
    // } {
    //     return this.dkgContractService.round1.contribution.leafs;
    // }

    // getRound1ContributionTreeLevel2(level1Index: number): MerkleLeaf[] {
    //     const result: MerkleLeaf[] = [];
    //     if (this.dkgContractService.round1.contribution.level2s[level1Index]) {
    //         const leafCount =
    //             this.dkgContractService.round1.contribution.level2s[level1Index]
    //                 .leafCount;
    //         for (let i = 0; i < leafCount; i++) {
    //             result.push(
    //                 this.dkgContractService.round1.contribution
    //                     .getLevel2Witness(Field(level1Index), Field(i))
    //                     .toJSON(),
    //             );
    //         }
    //         return result;
    //     } else {
    //         throw new NotFoundException();
    //     }
    // }

    // getRound1PublicKeyTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgContractService.round1.publicKey.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgContractService.round1.publicKey
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getRound1PublicKeyTreeLeafs(): {
    //     [key: string]: any;
    // } {
    //     return this.dkgContractService.round1.publicKey.leafs;
    // }

    // getRound1PublickeyTreeLevel2(level1Index: number): MerkleLeaf[] {
    //     const result: MerkleLeaf[] = [];
    //     if (this.dkgContractService.round1.publicKey.level2s[level1Index]) {
    //         const leafCount =
    //             this.dkgContractService.round1.publicKey.level2s[level1Index]
    //                 .leafCount;
    //         for (let i = 0; i < leafCount; i++) {
    //             result.push(
    //                 this.dkgContractService.round1.publicKey
    //                     .getLevel2Witness(Field(level1Index), Field(i))
    //                     .toJSON(),
    //             );
    //         }
    //         return result;
    //     } else {
    //         throw new NotFoundException();
    //     }
    // }

    // getRound2ZkAppTree(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgContractService.round2.zkApp.addressMap.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgContractService.round2.zkApp
    //                 .getWitness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getRound2ZkAppTreeLeafs(): { [key: string]: any } {
    //     return this.dkgContractService.round2.zkApp.addresses;
    // }

    // getRound2ReduceTree(): { [key: string]: MerkleLeaf } {
    //     const indexes = this.dkgContractService.round2.reducedActions;
    //     const result: { [key: string]: MerkleLeaf } = {};
    //     for (let i = 0; i < indexes.length; i++) {
    //         result[indexes[i].toString()] =
    //             this.dkgContractService.round2.reduceState
    //                 .getWitness(indexes[i])
    //                 .toJSON();
    //     }
    //     return result;
    // }

    // getRound2ReduceTreeLeafs(): { [key: string]: any } {
    //     return this.dkgContractService.round2.reduceState.actions;
    // }

    // getRound2ContributionTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgContractService.round2.contribution.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgContractService.round2.contribution
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getRound2ContributionTreeLeafs(): { [key: string]: any } {
    //     return this.dkgContractService.round2.contribution.leafs;
    // }

    // getRound2ContributionTreeLevel2(level1Index: number): MerkleLeaf[] {
    //     const result: MerkleLeaf[] = [];
    //     if (this.dkgContractService.round2.contribution.level2s[level1Index]) {
    //         const leafCount =
    //             this.dkgContractService.round2.contribution.level2s[level1Index]
    //                 .leafCount;
    //         for (let i = 0; i < leafCount; i++) {
    //             result.push(
    //                 this.dkgContractService.round2.contribution
    //                     .getLevel2Witness(Field(level1Index), Field(i))
    //                     .toJSON(),
    //             );
    //         }
    //         return result;
    //     } else {
    //         throw new NotFoundException();
    //     }
    // }

    // getRound2EncryptionTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgContractService.round2.encryption.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgContractService.round2.encryption
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getRound2EncryptionTreeLeafs(): { [key: string]: any } {
    //     return this.dkgContractService.round2.encryption.leafs;
    // }

    // getRound2EncryptionTreeLevel2(level1Index: number): MerkleLeaf[] {
    //     const result: MerkleLeaf[] = [];
    //     if (this.dkgContractService.round2.encryption.level2s[level1Index]) {
    //         const leafCount =
    //             this.dkgContractService.round2.encryption.level2s[level1Index]
    //                 .leafCount;
    //         for (let i = 0; i < leafCount; i++) {
    //             result.push(
    //                 this.dkgContractService.round2.encryption
    //                     .getLevel2Witness(Field(level1Index), Field(i))
    //                     .toJSON(),
    //             );
    //         }
    //         return result;
    //     } else {
    //         throw new NotFoundException();
    //     }
    // }

    // getRequesterTreeLevel1(): { [key: string]: MerkleLeaf } {
    //     const indexes = this.dkgUsageContractService.requestIds;
    //     const result: { [key: string]: MerkleLeaf } = {};
    //     for (let i = 0; i < indexes.length; i++) {
    //         result[indexes[i].toString()] =
    //             this.dkgUsageContractService.dkgRequest.requester
    //                 .getWitness(Field(indexes[i]))
    //                 .toJSON();
    //     }
    //     return result;
    // }

    // getRequesterTreeLeafs(): { [key: string]: any } {
    //     return this.dkgUsageContractService.dkgRequest.requester.leafs;
    // }

    // getRequestStatusTreeLevel1(): { [key: string]: MerkleLeaf } {
    //     const indexes = this.dkgUsageContractService.requestIds;
    //     const result: { [key: string]: MerkleLeaf } = {};
    //     for (let i = 0; i < indexes.length; i++) {
    //         result[indexes[i].toString()] =
    //             this.dkgUsageContractService.dkgRequest.requestStatus
    //                 .getWitness(Field(indexes[i]))
    //                 .toJSON();
    //     }
    //     return result;
    // }

    // getRequestStatusTreeLeafs(): { [key: string]: any } {
    //     return this.dkgUsageContractService.dkgRequest.requestStatus.leafs;
    // }

    // getRequestStatusLeavesLevel1(): { [key: string]: string } {
    //     const indexes = this.dkgUsageContractService.requestIds;
    //     const result: { [key: string]: string } = {};
    //     for (let i = 0; i < indexes.length; i++) {
    //         result[indexes[i].toString()] =
    //             this.dkgUsageContractService.dkgRequest.requestStatus.level1
    //                 .get(Field(indexes[i]))
    //                 .toJSON();
    //     }
    //     return result;
    // }

    // getResponseZkAppTree(): MerkleLeaf[] {
    //     const leafCount =
    //         this.dkgUsageContractService.dkgResponse.zkApp.addressMap.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.dkgUsageContractService.dkgResponse.zkApp
    //                 .getWitness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getResponseZkAppTreeLeafs(): { [key: string]: any } {
    //     return this.dkgUsageContractService.dkgResponse.zkApp.addresses;
    // }

    // getResponseReduceTree(): { [key: string]: MerkleLeaf } {
    //     const indexes = this.dkgUsageContractService.dkgResponse.reducedActions;
    //     const result: { [key: string]: MerkleLeaf } = {};
    //     for (let i = 0; i < indexes.length; i++) {
    //         result[indexes[i].toString()] =
    //             this.dkgUsageContractService.dkgResponse.reduceState
    //                 .getWitness(indexes[i])
    //                 .toJSON();
    //     }
    //     return result;
    // }

    // getResponseReduceTreeLeafs(): { [key: string]: any } {
    //     return this.dkgUsageContractService.dkgResponse.reduceState.actions;
    // }

    // getResponseContributionTreeLevel1(): { [key: string]: MerkleLeaf } {
    //     const indexes = this.dkgUsageContractService.requestIds;
    //     const result: { [key: string]: MerkleLeaf } = {};
    //     for (let i = 0; i < indexes.length; i++) {
    //         result[indexes[i].toString()] =
    //             this.dkgUsageContractService.dkgResponse.contribution
    //                 .getLevel1Witness(Field(indexes[i]))
    //                 .toJSON();
    //     }
    //     return result;
    // }

    // getResponseContributionTreeLeafs(): { [key: string]: any } {
    //     return this.dkgUsageContractService.dkgResponse.contribution.leafs;
    // }

    // getResponseContributionTreeLevel2(level1Index: string): MerkleLeaf[] {
    //     try {
    //         const result: MerkleLeaf[] = [];
    //         const index = Field(level1Index);
    //         if (
    //             this.dkgUsageContractService.dkgResponse.contribution.level2s[
    //                 level1Index
    //             ]
    //         ) {
    //             const leafCount =
    //                 this.dkgUsageContractService.dkgResponse.contribution
    //                     .level2s[level1Index].leafCount;
    //             for (let i = 0; i < leafCount; i++) {
    //                 result.push(
    //                     this.dkgUsageContractService.dkgResponse.contribution
    //                         .getLevel2Witness(index, Field(i))
    //                         .toJSON(),
    //                 );
    //             }
    //             return result;
    //         } else {
    //             throw new NotFoundException();
    //         }
    //     } catch (err) {
    //         throw new BadRequestException();
    //     }
    // }

    // getCampaignInfoTreeLevel1(): MerkleLeaf[] {
    //     const leafCount = this.campaignContractService.info.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.campaignContractService.info
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getCampaignInfoTreeLeafs(): { [key: string]: any } {
    //     return this.campaignContractService.info.leafs;
    // }

    // getCampaignOwnerTreeLevel1(): MerkleLeaf[] {
    //     const leafCount = this.campaignContractService.owner.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.campaignContractService.owner
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getCampaignOwnerTreeLeafs(): { [key: string]: any } {
    //     return this.campaignContractService.owner.leafs;
    // }

    // getCampaignStatusTreeLevel1(): MerkleLeaf[] {
    //     const leafCount = this.campaignContractService.status.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.campaignContractService.status
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getCampaignStatusTreeLeafs(): { [key: string]: any } {
    //     return this.campaignContractService.status.leafs;
    // }

    // getCampaignConfigTreeLevel1(): MerkleLeaf[] {
    //     const leafCount = this.campaignContractService.config.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.campaignContractService.config
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getCampaignConfigTreeLeafs(): { [key: string]: any } {
    //     return this.campaignContractService.config.leafs;
    // }

    // getCampaignZkAppTree(): MerkleLeaf[] {
    //     const leafCount =
    //         this.campaignContractService.zkApp.addressMap.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.campaignContractService.zkApp
    //                 .getWitness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getCampaignZkAppTreeLeafs(): { [key: string]: any } {
    //     return this.campaignContractService.zkApp.addresses;
    // }

    // getParticipationCounterTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.participationContractService.counter.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.participationContractService.counter
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getParticipationCounterTreeLeafs(): { [key: string]: any } {
    //     return this.participationContractService.counter.leafs;
    // }

    // getParticipationIndexTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.participationContractService.index.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.participationContractService.index
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getParticipationIndexTreeLeafs(): { [key: string]: any } {
    //     return this.participationContractService.index.leafs;
    // }

    // getParticipationInfoTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.participationContractService.info.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.participationContractService.info
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getParticipationInfoTreeLeafs(): { [key: string]: any } {
    //     return this.participationContractService.info.leafs;
    // }

    // getParticipationZkAppTree(): MerkleLeaf[] {
    //     const leafCount =
    //         this.participationContractService.zkApp.addressMap.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.participationContractService.zkApp
    //                 .getWitness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getParticipationZkAppTreeLeafs(): { [key: string]: any } {
    //     return this.participationContractService.zkApp.addresses;
    // }

    // getProjectInfoTreeLevel1(): MerkleLeaf[] {
    //     const leafCount = this.projectContractService.info.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.projectContractService.info
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getProjectInfoTreeLeafs(): { [key: string]: any } {
    //     return this.projectContractService.info.leafs;
    // }

    // getProjectMemberTreeLevel1(): MerkleLeaf[] {
    //     const leafCount = this.projectContractService.member.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.projectContractService.member
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getProjectMemberTreeLeafs(): { [key: string]: any } {
    //     return this.projectContractService.member.leafs;
    // }

    // getProjectMemberTreeLevel2(level1Index: number): MerkleLeaf[] {
    //     const result: MerkleLeaf[] = [];
    //     if (this.projectContractService.member.level2s[level1Index]) {
    //         const leafCount =
    //             this.projectContractService.member.level2s[level1Index]
    //                 .leafCount;
    //         for (let i = 0; i < leafCount; i++) {
    //             result.push(
    //                 this.projectContractService.member
    //                     .getLevel2Witness(Field(level1Index), Field(i))
    //                     .toJSON(),
    //             );
    //         }
    //         return result;
    //     } else {
    //         throw new NotFoundException();
    //     }
    // }

    // getProjectPayeeTreeLevel1(): MerkleLeaf[] {
    //     const leafCount = this.projectContractService.payee.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.projectContractService.payee
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }
    // getProjectPayeeTreeLeafs(): { [key: string]: any } {
    //     return this.projectContractService.payee.leafs;
    // }

    // getFundingTotalMTreeLevel1(): MerkleLeaf[] {
    //     const leafCount = this.fundingContractService.totalM.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.fundingContractService.totalM
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getFundingTotalMTreeLeafs(): { [key: string]: any } {
    //     return this.fundingContractService.totalM.leafs;
    // }

    // getFundingTotalRTreeLevel1(): MerkleLeaf[] {
    //     const leafCount = this.fundingContractService.totalR.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.fundingContractService.totalR
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getFundingTotalRTreeLeafs(): { [key: string]: any } {
    //     return this.fundingContractService.totalR.leafs;
    // }

    // getFundingRequestIdTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.fundingContractService.requestId.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.fundingContractService.requestId
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getFundingRequestIdTreeLeafs(): { [key: string]: any } {
    //     return this.fundingContractService.requestId.leafs;
    // }

    // getFundingZkAppTree(): MerkleLeaf[] {
    //     const leafCount =
    //         this.fundingContractService.zkApp.addressMap.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.fundingContractService.zkApp.getWitness(Field(i)).toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getFundingZkAppTreeLeafs(): { [key: string]: any } {
    //     return this.fundingContractService.zkApp.addresses;
    // }

    // getFundingReduceTree(): { [key: string]: MerkleLeaf } {
    //     const indexes = this.fundingContractService.reduceActions;
    //     const result: { [key: string]: MerkleLeaf } = {};
    //     for (let i = 0; i < indexes.length; i++) {
    //         result[indexes[i].toString()] =
    //             this.fundingContractService.reduceState
    //                 .getWitness(indexes[i])
    //                 .toJSON();
    //     }
    //     return result;
    // }

    // getFundingReduceTreeLeafs(): {
    //     [key: string]: any;
    // } {
    //     return this.fundingContractService.reduceState.actions;
    // }

    // getTreasuryClaimedTreeLevel1(): MerkleLeaf[] {
    //     const leafCount =
    //         this.treasuryManagerContractService.claimed.level1.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.treasuryManagerContractService.claimed
    //                 .getLevel1Witness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getTreasuryClaimedTreeLeafs(): { [key: string]: any } {
    //     return this.treasuryManagerContractService.claimed.leafs;
    // }

    // getTreasuryZkAppTree(): MerkleLeaf[] {
    //     const leafCount =
    //         this.treasuryManagerContractService.zkApp.addressMap.leafCount;
    //     const result: MerkleLeaf[] = [];
    //     for (let i = 0; i < leafCount; i++) {
    //         result.push(
    //             this.treasuryManagerContractService.zkApp
    //                 .getWitness(Field(i))
    //                 .toJSON(),
    //         );
    //     }
    //     return result;
    // }

    // getTreasuryZkAppTreeLeafs(): { [key: string]: any } {
    //     return this.treasuryManagerContractService.zkApp.addresses;
    // }
}
