import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Field } from 'o1js';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';
import { CommitteeContractService } from 'src/mina-contracts/committee-contract/committee-contract.service';
import { DkgContractsService } from 'src/mina-contracts/dkg-contracts/dkg-contracts.service';
import { DkgUsageContractsService } from 'src/mina-contracts/dkg-usage-contracts/dkg-usage-contracts.service';

@Injectable()
export class StoragesService {
    constructor(
        private readonly committeeContractsService: CommitteeContractService,
        private readonly dkgContractService: DkgContractsService,
        private readonly dkgUsageContractService: DkgUsageContractsService,
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
        const leafCount = this.dkgContractService.dkg.zkApp.addresses.leafCount;
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
            this.dkgContractService.round1.zkApp.addresses.leafCount;
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
            this.dkgContractService.round2.zkApp.addresses.leafCount;
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

    getResponseZkApTree(): MerkleLeaf[] {
        const leafCount = this.dkgContractService.dkg.zkApp.addresses.leafCount;
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
}
