import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CommitteesService } from '../committees/committees.service';
import { Field } from 'o1js';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';
import { DkgService } from '../dkg/dkg.service';
import { Storage } from '@auxo-dev/dkg';

@Injectable()
export class StoragesService {
    constructor(
        private readonly committeesService: CommitteesService,
        private readonly dkgService: DkgService,
    ) {}

    getMemberTreeLevel1(): MerkleLeaf[] {
        const leafCount = this.committeesService.memberTree.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.committeesService.memberTree
                    .getLevel1Witness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getMemberTreeLevel2(level1Index: number) {
        const result: MerkleLeaf[] = [];
        if (this.committeesService.memberTree.level2s[level1Index]) {
            const leafCount =
                this.committeesService.memberTree.level2s[level1Index]
                    .leafCount;
            for (let i = 0; i < leafCount; i++) {
                result.push(
                    this.committeesService.memberTree
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
        const leafCount = this.committeesService.settingTree.level1.leafCount;
        const result: MerkleLeaf[] = [];
        for (let i = 0; i < leafCount; i++) {
            result.push(
                this.committeesService.settingTree
                    .getWitness(Field(i))
                    .toJSON(),
            );
        }
        return result;
    }

    getKeyCounterTreeLevel1(): MerkleLeaf[] {
        return null;
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
