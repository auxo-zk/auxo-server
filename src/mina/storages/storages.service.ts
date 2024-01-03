import { Injectable } from '@nestjs/common';
import { CommitteesService } from '../committees/committees.service';
import { Field } from 'o1js';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';
import { DkgService } from '../dkg/dkg.service';

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
}
