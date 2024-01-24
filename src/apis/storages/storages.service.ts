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
import { TreasuryContractService } from 'src/mina-contracts/treasury-contract/treasury-contract.service';

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
        private readonly treasuryContractService: TreasuryContractService,
    ) {}

    getMemberTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.committeeContractsService.memberTree.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.committeeContractsService.memberTree
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getMemberTreeLevel2(level1Index: number) {
        const result: MerkleLeaf[] = [];
        if (this.committeeContractsService.memberTree.level2s[level1Index]) {
            const leafCount =
                this.committeeContractsService.memberTree.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.committeeContractsService.memberTree
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getSettingTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.committeeContractsService.settingTree.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.committeeContractsService.settingTree
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getDKGZkAppTree(): MerkleLeaf[] {
        this.logger.log(process.pid);
        const leafCount =
            this.dkgContractService.dkg.zkApp.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.dkg.zkApp.getWitness(Field(i)).toJSON(),
            );
        }
        return result;
    }

    getKeyCounterTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.dkg.keyCounter.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.dkg.keyCounter
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getKeyStatusTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.dkg.keyStatus.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.dkg.keyStatus
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1ZkAppTree(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round1.zkApp.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.zkApp
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1ReduceTree(): { [key: string]: MerkleLeaf } {
        const indexes = this.dkgContractService.round1.reducedActions;
        const result: { [key: string]: MerkleLeaf } = {};
        for (let i = 0; i < indexes.length; i++) {
            result[indexes[i].toString()] =
                this.dkgContractService.round1.reduceState
                    .getWitness(indexes[i])
                    .toJSON();
        }
        return result;
    }

    getRound1ContributionTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round1.contribution.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.contribution
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1ContributionTreeLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (this.dkgContractService.round1.contribution.level2s[level1Index]) {
            const leafCount =
                this.dkgContractService.round1.contribution.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round1.contribution
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getRound1PublicKeyTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round1.publicKey.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.publicKey
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1PublickeyTreeLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (this.dkgContractService.round1.publicKey.level2s[level1Index]) {
            const leafCount =
                this.dkgContractService.round1.publicKey.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round1.publicKey
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getRound2ZkAppTree(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round2.zkApp.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round2.zkApp
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound2ReduceTree(): { [key: string]: MerkleLeaf } {
        const indexes = this.dkgContractService.round2.reducedActions;
        const result: { [key: string]: MerkleLeaf } = {};
        for (let i = 0; i < indexes.length; i++) {
            result[indexes[i].toString()] =
                this.dkgContractService.round2.reduceState
                    .getWitness(indexes[i])
                    .toJSON();
        }
        return result;
    }

    getRound2ContributionTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round2.contribution.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round2.contribution
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound2ContributionTreeLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (this.dkgContractService.round2.contribution.level2s[level1Index]) {
            const leafCount =
                this.dkgContractService.round2.contribution.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round2.contribution
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getRound2EncryptionTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round2.encryption.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round2.encryption
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound2EncryptionTreeLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (this.dkgContractService.round2.encryption.level2s[level1Index]) {
            const leafCount =
                this.dkgContractService.round2.encryption.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round2.encryption
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getRequesterTreeLevel1(): { [key: string]: MerkleLeaf } {
        const indexes = this.dkgUsageContractService.requestIds;
        const result: { [key: string]: MerkleLeaf } = {};
        for (let i = 0; i < indexes.length; i++) {
            result[indexes[i].toString()] =
                this.dkgUsageContractService.dkgRequest.requester
                    .getWitness(Field(indexes[i]))
                    .toJSON();
        }
        return result;
    }

    getRequesterLeavesLevel1(): { [key: string]: string } {
        const indexes = this.dkgUsageContractService.requestIds;
        const result: { [key: string]: string } = {};
        for (let i = 0; i < indexes.length; i++) {
            result[indexes[i].toString()] =
                this.dkgUsageContractService.dkgRequest.requester.level1
                    .get(Field(indexes[i]))
                    .toJSON();
        }
        return result;
    }

    getRequestStatusTreeLevel1(): { [key: string]: MerkleLeaf } {
        const indexes = this.dkgUsageContractService.requestIds;
        const result: { [key: string]: MerkleLeaf } = {};
        for (let i = 0; i < indexes.length; i++) {
            result[indexes[i].toString()] =
                this.dkgUsageContractService.dkgRequest.requestStatus
                    .getWitness(Field(indexes[i]))
                    .toJSON();
        }
        return result;
    }

    getRequestStatusLeavesLevel1(): { [key: string]: string } {
        const indexes = this.dkgUsageContractService.requestIds;
        const result: { [key: string]: string } = {};
        for (let i = 0; i < indexes.length; i++) {
            result[indexes[i].toString()] =
                this.dkgUsageContractService.dkgRequest.requestStatus.level1
                    .get(Field(indexes[i]))
                    .toJSON();
        }
        return result;
    }

    getResponseZkApTree(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.dkg.zkApp.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgUsageContractService.dkgResponse.zkApp
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getResponseReduceTree(): { [key: string]: MerkleLeaf } {
        const indexes = this.dkgUsageContractService.dkgResponse.reducedActions;
        const result: { [key: string]: MerkleLeaf } = {};
        for (let i = 0; i < indexes.length; i++) {
            result[indexes[i].toString()] =
                this.dkgUsageContractService.dkgResponse.reduceState
                    .getWitness(indexes[i])
                    .toJSON();
        }
        return result;
    }

    getResponseContributionTreeLevel1(): { [key: string]: MerkleLeaf } {
        const indexes = this.dkgUsageContractService.requestIds;
        const result: { [key: string]: MerkleLeaf } = {};
        for (let i = 0; i < indexes.length; i++) {
            result[indexes[i].toString()] =
                this.dkgUsageContractService.dkgResponse.contribution
                    .getLevel1Witness(Field(indexes[i]))
                    .toJSON();
        }
        return result;
    }

    getResponseContributionTreeLevel2(level1Index: string): MerkleLeaf[] {
        try {
            const result: MerkleLeaf[] = [];
            const index = Field(level1Index);
            if (
                this.dkgUsageContractService.dkgResponse.contribution.level2s[
                    level1Index
                ]
            ) {
                const leafCount =
                    this.dkgUsageContractService.dkgResponse.contribution
                        .level2s[level1Index].leafCount;
                for (let i = 0; i < leafCount; i++) {
                    result.push(
                        this.dkgUsageContractService.dkgResponse.contribution
                            .getLevel2Witness(index, Field(i))
                            .toJSON(),
                    );
                }
                return result;
            } else {
                throw new NotFoundException();
            }
        } catch (err) {
            throw new BadRequestException();
        }
    }

    getCampaignInfoTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.campaignContractService.info.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.campaignContractService.info
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getCampaignOwnerTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.campaignContractService.owner.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.campaignContractService.owner
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getCampaignStatusTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.campaignContractService.status.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.campaignContractService.status
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getCampaignConfigTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.campaignContractService.config.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.campaignContractService.config
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getCampaignZkAppTree(): MerkleLeaf[] {
        const leafCount =
            this.campaignContractService.zkApp.addresses.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.campaignContractService.zkApp
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getParticipationCounterTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.participationContractService.counter.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.participationContractService.counter
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getParticipationIndexTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.participationContractService.index.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.participationContractService.index
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getParticipationInfoTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.participationContractService.info.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.participationContractService.info
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getParticipationZkAppTree(): MerkleLeaf[] {
        const leafCount =
            this.participationContractService.zkApp.addresses.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.participationContractService.zkApp
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getProjectInfoTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.projectContractService.info.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.projectContractService.info
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getProjectMemberTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.projectContractService.member.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.projectContractService.member
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getProjectMemberTreeLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (this.projectContractService.member.level2s[level1Index]) {
            const leafCount =
                this.projectContractService.member.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.projectContractService.member
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getProjectAddressTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.projectContractService.address.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.projectContractService.address
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getFundingTotalMTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.fundingContractService.totalM.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.fundingContractService.totalM
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getFundingTotalRTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.fundingContractService.totalR.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.fundingContractService.totalR
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getFundingRequestIdTreeLevel1(): MerkleLeaf[] {
        const leafCount =
            this.fundingContractService.requestId.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.fundingContractService.requestId
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getFundingZkAppTree(): MerkleLeaf[] {
        const leafCount = this.fundingContractService.zkApp.addresses.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.fundingContractService.zkApp.getWitness(Field(i)).toJSON(),
            );
        }
        return result;
    }

    getTreasuryClaimedTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.treasuryContractService.claimed.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.treasuryContractService.claimed
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getTreasuryZkAppTree(): MerkleLeaf[] {
        const leafCount =
            this.treasuryContractService.zkApp.addresses.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.treasuryContractService.zkApp
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }
}
