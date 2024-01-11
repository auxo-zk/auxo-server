import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { StoragesService } from './storages.service';
import { ApiTags } from '@nestjs/swagger';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';

@Controller('storages')
export class StoragesController {
    constructor(private readonly storagesService: StoragesService) {}

    @Get('committee/member/level1')
    @ApiTags('Storage')
    getMemberTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getMemberTreeLevel1();
    }

    @Get('committee/member/level2/:level1Index')
    @ApiTags('Storage')
    getMemberTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getMemberTreeLevel2(level1Index);
    }

    @Get('committee/setting/level1')
    @ApiTags('Storage')
    getSettingTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getSettingTreeLevel1();
    }

    @Get('dkg/zkapps')
    @ApiTags('Storage')
    getDKGZkApps(): MerkleLeaf[] {
        return this.storagesService.getDKGZkApps();
    }

    @Get('dkg/key-counter/level1')
    @ApiTags('Storage')
    getKeyCounterTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyCounterTreeLevel1();
    }

    @Get('dkg/key-status/level1')
    @ApiTags('Storage')
    getKeyStatusTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyStatusTreeLevel1();
    }

    @Get('round1/zkapps')
    @ApiTags('Storage')
    getRound1ZkApps(): MerkleLeaf[] {
        return this.storagesService.getRound1ZkApps();
    }

    @Get('round1/reduce')
    @ApiTags('Storage')
    getRound1ReduceTree(): MerkleLeaf[] {
        return this.storagesService.getRound1ReduceTree();
    }

    @Get('round1/contribution/level1')
    @ApiTags('Storage')
    getRound1ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1ContributionTreeLevel1();
    }

    @Get('round1/contribution/level2/:level1Index')
    @ApiTags('Storage')
    getRound1ContributionTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound1ContributionTreeLevel2(
            level1Index,
        );
    }

    @Get('round1/public-key/level1')
    @ApiTags('Storage')
    getRound1PublicKeyTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1PublicKeyTreeLevel1();
    }

    @Get('round1/public-key/level2/:level1Index')
    @ApiTags('Storage')
    getRound1PublicKeyTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound1PublickeyTreeLevel2(level1Index);
    }

    @Get('round2/zkapps')
    @ApiTags('Storage')
    getRound2ZkApps(): MerkleLeaf[] {
        return this.storagesService.getRound2ZkApps();
    }

    @Get('round2/contribution/level1')
    @ApiTags('Storage')
    getRound2ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2ContributionTreeLevel1();
    }

    @Get('round2/contribution/level2/:level1Index')
    @ApiTags('Storage')
    getRound2ContributionTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound2ContributionTreeLevel2(
            level1Index,
        );
    }

    @Get('round2/encryption/level1')
    @ApiTags('Storage')
    getRound2EncryptionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2EncryptionTreeLevel1();
    }

    @Get('round2/encryption/level2/:level1Index')
    @ApiTags('Storage')
    getRound2EncryptionTreeLevel2(
        @Param('level1Index', ParseIntPipe) level1Index: number,
    ) {
        return this.storagesService.getRound2EncryptionTreeLevel2(level1Index);
    }
}
