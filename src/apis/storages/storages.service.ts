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
import { RequesterContractsService } from 'src/mina-contracts/requester-contract/requester-contract.service';
import { RollupContractService } from 'src/mina-contracts/rollup-contract/rollup-contract.service';
import { TreasuryManagerContractService } from 'src/mina-contracts/treasury-manager-contract/treasury-manager-contract.service';

@Injectable()
export class StoragesService {
    private readonly logger = new Logger(StoragesService.name);

    constructor(
        private readonly rollupContractService: RollupContractService,
        private readonly committeeContractsService: CommitteeContractService,
        private readonly dkgContractService: DkgContractsService,
        private readonly dkgUsageContractService: DkgUsageContractsService,
        private readonly requesterContractsService: RequesterContractsService,
        private readonly projectContractService: ProjectContractService,
        private readonly campaignContractService: CampaignContractService,
        private readonly participationContractService: ParticipationContractService,
        private readonly fundingContractService: FundingContractService,
        private readonly treasuryManagerContractService: TreasuryManagerContractService,
    ) {}

    getRollupZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.rollupContractService.zkAppStorage.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.rollupContractService.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRollupZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.rollupContractService.zkAppStorage.addresses;
    }

    getRollupCounterStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.rollupContractService.counterStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.rollupContractService.counterStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRollupCounterStorageLeafs(): {
        [key: string]: any;
    } {
        return this.rollupContractService.counterStorage.leafs;
    }

    getRollupStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.rollupContractService.rollupStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.rollupContractService.rollupStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRollupStorageLeafs(): {
        [key: string]: any;
    } {
        return this.rollupContractService.rollupStorage.leafs;
    }

    getCommitteeZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.committeeContractsService.zkAppStorage.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.committeeContractsService.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getCommitteeZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.committeeContractsService.zkAppStorage.addresses;
    }

    getMemberStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.committeeContractsService.memberStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.committeeContractsService.memberStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getMemberStorageLeafs(): {
        [key: string]: any;
    } {
        return this.committeeContractsService.memberStorage.leafs;
    }

    getMemberStorageLevel2(level1Index: number) {
        const result: MerkleLeaf[] = [];
        if (this.committeeContractsService.memberStorage.level2s[level1Index]) {
            const leafCount =
                this.committeeContractsService.memberStorage.level2s[
                    level1Index
                ].leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.committeeContractsService.memberStorage
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getSettingStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.committeeContractsService.settingStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.committeeContractsService.settingStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getSettingStorageLeafs(): {
        [key: string]: any;
    } {
        return this.committeeContractsService.settingStorage.leafs;
    }

    getDkgZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.dkg.zkAppStorage.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.dkg.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getDkgZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgContractService.dkg.zkAppStorage.addresses;
    }

    getKeyCounterStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.dkg.keyCounterStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.dkg.keyCounterStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getKeyCounterStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgContractService.dkg.keyCounterStorage.leafs;
    }

    getKeyStatusStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.dkg.keyStatusStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.dkg.keyStatusStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getKeyStatusStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgContractService.dkg.keyStatusStorage.leafs;
    }

    getKeyStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.dkg.keyStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.dkg.keyStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getKeyStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgContractService.dkg.keyStorage.leafs;
    }

    getProcessStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.dkg.processStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.dkg.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getProcessStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgContractService.dkg.processStorage.leafs;
    }

    getRound1ZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round1.zkAppStorage.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1ZkAppStorageLeafs(): { [key: string]: any } {
        return this.dkgContractService.round1.zkAppStorage.addresses;
    }

    getRound1ContributionStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round1.contributionStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.contributionStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1ContributionStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgContractService.round1.contributionStorage.leafs;
    }

    getRound1ContributionStorageLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (
            this.dkgContractService.round1.contributionStorage.level2s[
                level1Index
            ]
        ) {
            const leafCount =
                this.dkgContractService.round1.contributionStorage.level2s[
                    level1Index
                ].leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round1.contributionStorage
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getRound1PublicKeyStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round1.publicKeyStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.publicKeyStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1PublicKeyStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgContractService.round1.publicKeyStorage.leafs;
    }

    getRound1PublicKeyStorageLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (
            this.dkgContractService.round1.publicKeyStorage.level2s[level1Index]
        ) {
            const leafCount =
                this.dkgContractService.round1.publicKeyStorage.level2s[
                    level1Index
                ].leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round1.publicKeyStorage
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getRound1ProcessStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round1.processStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1ProcessStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgContractService.round1.processStorage.leafs;
    }

    getRound2ZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round2.zkAppStorage.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound2ZkAppStorageLeafs(): { [key: string]: any } {
        return this.dkgContractService.round2.zkAppStorage.addresses;
    }

    getRound2ContributionStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round2.contributionStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round2.contributionStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound2ContributionStorageLeafs(): { [key: string]: any } {
        return this.dkgContractService.round2.contributionStorage.leafs;
    }

    getRound2ContributionStorageLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (
            this.dkgContractService.round2.contributionStorage.level2s[
                level1Index
            ]
        ) {
            const leafCount =
                this.dkgContractService.round2.contributionStorage.level2s[
                    level1Index
                ].leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round2.contributionStorage
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getRound2EncryptionStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round2.encryptionStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round2.encryptionStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound2EncryptionStorageLeafs(): { [key: string]: any } {
        return this.dkgContractService.round2.encryptionStorage.leafs;
    }

    getRound2EncryptionStorageLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (
            this.dkgContractService.round2.encryptionStorage.level2s[
                level1Index
            ]
        ) {
            const leafCount =
                this.dkgContractService.round2.encryptionStorage.level2s[
                    level1Index
                ].leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round2.encryptionStorage
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getRound2ProcessStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgContractService.round2.processStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound2ProcessStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgContractService.round2.processStorage.leafs;
    }

    getRequestZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgRequest.zkAppStorage.addressMap
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgUsageContractService.dkgRequest.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRequestZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgRequest.zkAppStorage.addresses;
    }

    getRequestKeyIndexStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgRequest.keyIndexStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRequestKeyIndexStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgRequest.keyIndexStorage.leafs;
    }

    getRequestTaskStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgRequest.taskStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRequestTaskStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgRequest.taskStorage.leafs;
    }

    getRequestAccumulationStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgRequest.accumulationStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRequestAccumulationStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgRequest.accumulationStorage
            .leafs;
    }

    getRequestExpirationStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgRequest.expirationStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRequestExpirationStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgRequest.expirationStorage.leafs;
    }

    getRequestResultStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgRequest.resultStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRequestResultStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgRequest.resultStorage.leafs;
    }

    getResponseZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgResponse.zkAppStorage.addressMap
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgUsageContractService.dkgRequest.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getResponseZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgResponse.zkAppStorage.addresses;
    }

    getResponseContributionStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgResponse.contributionStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getResponseContributionStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgResponse.contributionStorage
            .leafs;
    }

    getResponseResponseStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgResponse.responseStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getResponseResponseStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgResponse.responseStorage.leafs;
    }

    getResponseProcessStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.dkgUsageContractService.dkgResponse.processStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgContractService.round1.processStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getResponseProcessStorageLeafs(): {
        [key: string]: any;
    } {
        return this.dkgUsageContractService.dkgResponse.processStorage.leafs;
    }

    getRequesterZkAppStorage(requesterAddress: string): MerkleLeaf[] {
        try {
            const leafCount =
                this.requesterContractsService.storage(requesterAddress)
                    .zkAppStorage.addressMap.leafCount;
            const result: MerkleLeaf[] = [];
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgUsageContractService.dkgRequest.zkAppStorage
                        .getWitness(Field(i))
                        .toJSON(),
                );
            }
            return result;
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRequesterZkAppStorageLeafs(requesterAddress: string): {
        [key: string]: any;
    } {
        try {
            return this.requesterContractsService.storage(requesterAddress)
                .zkAppStorage.addresses;
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRequesterKeyIndexStorageLevel1(requesterAddress: string): MerkleLeaf[] {
        try {
            const leafCount =
                this.requesterContractsService.storage(requesterAddress)
                    .keyIndexStorage.level1.leafCount;
            const result: MerkleLeaf[] = [];
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round1.processStorage
                        .getWitness(Field(i))
                        .toJSON(),
                );
            }
            return result;
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRequesterKeyIndexStorageLeafs(requesterAddress: string): {
        [key: string]: any;
    } {
        try {
            return this.requesterContractsService.storage(requesterAddress)
                .keyIndexStorage.leafs;
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRequesterTimestampStorageLevel1(requesterAddress: string): MerkleLeaf[] {
        try {
            const leafCount =
                this.requesterContractsService.storage(requesterAddress)
                    .timestampStorage.level1.leafCount;
            const result: MerkleLeaf[] = [];
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round1.processStorage
                        .getWitness(Field(i))
                        .toJSON(),
                );
            }
            return result;
        } catch (err) {
            throw new BadRequestException();
        }
    }

    getRequesterTimestampStorageLeafs(requesterAddress: string): {
        [key: string]: any;
    } {
        try {
            return this.requesterContractsService.storage(requesterAddress)
                .timestampStorage.leafs;
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRequesterAccumulationStorageLevel1(
        requesterAddress: string,
    ): MerkleLeaf[] {
        try {
            const leafCount =
                this.requesterContractsService.storage(requesterAddress)
                    .accumulationStorage.level1.leafCount;
            const result: MerkleLeaf[] = [];
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round1.processStorage
                        .getWitness(Field(i))
                        .toJSON(),
                );
            }
            return result;
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRequesterAccumulationStorageLeafs(requesterAddress: string): {
        [key: string]: any;
    } {
        try {
            return this.requesterContractsService.storage(requesterAddress)
                .accumulationStorage.leafs;
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRequesterCommitmentStorageLevel1(
        requesterAddress: string,
    ): MerkleLeaf[] {
        try {
            const leafCount =
                this.requesterContractsService.storage(requesterAddress)
                    .commitmentStorage.level1.leafCount;
            const result: MerkleLeaf[] = [];
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgContractService.round1.processStorage
                        .getWitness(Field(i))
                        .toJSON(),
                );
            }
            return result;
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getRequesterCommitmentStorageLeafs(requesterAddress: string): {
        [key: string]: any;
    } {
        try {
            return this.requesterContractsService.storage(requesterAddress)
                .commitmentStorage.leafs;
        } catch (err) {
            throw new BadRequestException(err);
        }
    }

    getProjectMemberStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.projectContractService.memberStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.projectContractService.memberStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getProjectMemberStorageLeafs(): {
        [key: string]: any;
    } {
        return this.projectContractService.memberStorage.leafs;
    }

    getProjectIpfsHashStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.projectContractService.ipfsHashStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.projectContractService.ipfsHashStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getProjectIpfsHashStorageLeafs(): {
        [key: string]: any;
    } {
        return this.projectContractService.ipfsHashStorage.leafs;
    }

    getProjectTreasuryAddressStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.projectContractService.treasuryAddressStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.projectContractService.treasuryAddressStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getProjectTreasuryAddressStorageLeafs(): {
        [key: string]: any;
    } {
        return this.projectContractService.treasuryAddressStorage.leafs;
    }

    getCampaignTimelineStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.campaignContractService.timelineStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.campaignContractService.timelineStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getCampaignTimelineStorageLeafs(): {
        [key: string]: any;
    } {
        return this.campaignContractService.timelineStorage.leafs;
    }

    getCampaignIpfsHashStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.campaignContractService.ipfsHashStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.campaignContractService.ipfsHashStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getCampaignIpfsHashStorageLeafs(): {
        [key: string]: any;
    } {
        return this.campaignContractService.ipfsHashStorage.leafs;
    }

    getCampaignKeyIndexStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.campaignContractService.keyIndexStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.campaignContractService.ipfsHashStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getCampaignKeyIndexStorageLeafs(): {
        [key: string]: any;
    } {
        return this.campaignContractService.keyIndexStorage.leafs;
    }

    getCampaignZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.campaignContractService.zkAppStorage.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.campaignContractService.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getCampaignZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.campaignContractService.zkAppStorage.addresses;
    }

    getParticipationProjectIndexStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.participationContractService.projectIndexStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.participationContractService.projectIndexStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getParticipationProjectIndexStorageLeafs(): {
        [key: string]: any;
    } {
        return this.participationContractService.projectIndexStorage.leafs;
    }

    getParticipationProjectCounterStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.participationContractService.projectCounterStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.participationContractService.projectCounterStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getParticipationProjectCounterStorageLeafs(): {
        [key: string]: any;
    } {
        return this.participationContractService.projectCounterStorage.leafs;
    }

    getParticipationIpfsHashStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.participationContractService.ipfsHashStorage.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.participationContractService.ipfsHashStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getParticipationIpfsHashStorageLeafs(): {
        [key: string]: any;
    } {
        return this.participationContractService.ipfsHashStorage.leafs;
    }

    getParticipationZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.participationContractService.zkAppStorage.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.participationContractService.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getParticipationZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.participationContractService.zkAppStorage.addresses;
    }

    getFundingInformationStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.fundingContractService.fundingInformationStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.fundingContractService.fundingInformationStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getFundingInformationStorageLeafs(): {
        [key: string]: any;
    } {
        return this.fundingContractService.fundingInformationStorage.leafs;
    }

    getFundingZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.fundingContractService.zkAppStorage.addressMap.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.fundingContractService.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getFundingZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.fundingContractService.zkAppStorage.addresses;
    }

    getTreasuryManagerCampaignStateStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.treasuryManagerContractService.campaignStateStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.treasuryManagerContractService.campaignStateStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getTreasuryManagerCampaignStateStorageLeafs(): {
        [key: string]: any;
    } {
        return this.treasuryManagerContractService.campaignStateStorage.leafs;
    }

    getTreasuryManagerClaimedAmountStorageLevel1(): MerkleLeaf[] {
        const leafCount =
            this.treasuryManagerContractService.claimedAmountStorage.level1
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.treasuryManagerContractService.claimedAmountStorage
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getTreasuryManagerClaimedAmountStorageLeafs(): {
        [key: string]: any;
    } {
        return this.treasuryManagerContractService.claimedAmountStorage.leafs;
    }

    getTreasuryManagerZkAppStorage(): MerkleLeaf[] {
        const leafCount =
            this.treasuryManagerContractService.zkAppStorage.addressMap
                .leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.treasuryManagerContractService.zkAppStorage
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getTreasuryManagerZkAppStorageLeafs(): {
        [key: string]: any;
    } {
        return this.treasuryManagerContractService.zkAppStorage.addresses;
    }
}
