import { Injectable, NotFoundException } from '@nestjs/common';
import { Field } from 'o1js';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';
import { CommitteeContractService } from 'src/mina-contracts/committee-contract/committee-contract.service';
import { DkgContractsService } from 'src/mina-contracts/dkg-contracts/dkg-contracts.service';

@Injectable()
export class StoragesService {
    constructor(
        private readonly committeeContractsService: CommitteeContractService,
        private readonly dkgService: DkgContractsService,
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

    getDKGZkApps(): MerkleLeaf[] {
        const leafCount = this.dkgService.dkg.zkApp.addresses.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgService.dkg.zkApp.getWitness(Field(i)).toJSON(),
            );
        }
        return result;
    }

    getKeyCounterTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.dkgService.dkg.keyCounter.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgService.dkg.keyCounter
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getKeyStatusTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.dkgService.dkg.keyStatus.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgService.dkg.keyStatus
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1ZkApps(): MerkleLeaf[] {
        const leafCount = this.dkgService.round1.zkApp.addresses.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgService.round1.zkApp.getWitness(Field(i)).toJSON(),
            );
        }
        return result;
    }

    getRound1ReduceTree(): MerkleLeaf[] {
        const indexes = this.dkgService.round1.reducedActions;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < indexes.length; i++) {
            result[indexes[i].toString()] = this.dkgService.round1.reduceState
                .getWitness(indexes[i])
                .toJSON();
        }
        return result;
    }

    getRound1ContributionTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.dkgService.round1.contribution.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgService.round1.contribution
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1ContributionTreeLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (this.dkgService.round1.contribution.level2s[level1Index]) {
            const leafCount =
                this.dkgService.round1.contribution.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgService.round1.contribution
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
        const leafCount = this.dkgService.round1.publicKey.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgService.round1.publicKey
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound1PublickeyTreeLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (this.dkgService.round1.publicKey.level2s[level1Index]) {
            const leafCount =
                this.dkgService.round1.publicKey.level2s[level1Index].leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgService.round1.publicKey
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }

    getRound2ZkApps(): MerkleLeaf[] {
        const leafCount = this.dkgService.round2.zkApp.addresses.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgService.round2.zkApp.getWitness(Field(i)).toJSON(),
            );
        }
        return result;
    }

    getRound2ContributionTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.dkgService.round2.contribution.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgService.round2.contribution
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound2ContributionTreeLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (this.dkgService.round2.contribution.level2s[level1Index]) {
            const leafCount =
                this.dkgService.round2.contribution.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgService.round2.contribution
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
        const leafCount = this.dkgService.round2.encryption.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.dkgService.round2.encryption
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getRound2EncryptionTreeLevel2(level1Index: number): MerkleLeaf[] {
        const result: MerkleLeaf[] = [];
        if (this.dkgService.round2.encryption.level2s[level1Index]) {
            const leafCount =
                this.dkgService.round2.encryption.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.dkgService.round2.encryption
                        .getLevel2Witness(Field(level1Index), Field(i))
                        .toJSON(),
                );
            }
            return result;
        } else {
            throw new NotFoundException();
        }
    }
}
