import { Controller, Get } from '@nestjs/common';
import { StoragesService } from './storages.service';
import { ApiTags } from '@nestjs/swagger';
import { MerkleLeaf } from 'src/entities/merkle-leaf.entity';

@Controller('storages')
export class StoragesController {
    constructor(private readonly storagesService: StoragesService) {}

    @Get('committee/member')
    @ApiTags('Storage')
    getMemberTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getMemberTreeLevel1();
    }

    @Get('committee/setting')
    @ApiTags('Storage')
    getSettingTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getSettingTreeLevel1();
    }

    @Get('dkg/key-counter')
    @ApiTags('Storage')
    getKeyCounterTreeLevel1(): MerkleLeaf[] {
        return null;
    }

    @Get('dkg/key-status')
    @ApiTags('Storage')
    getKeyStatusTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getKeyStatusTreeLevel1();
    }

    @Get('round-1/contribution')
    @ApiTags('Storage')
    getRound1ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1ContributionTreeLevel1();
    }

    @Get('round-1/public-key')
    @ApiTags('Storage')
    getRound1PublicKeyTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound1PublicKeyTreeLevel1();
    }

    @Get('round-2/contribution')
    @ApiTags('Storage')
    getRound2ContributionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2ContributionTreeLevel1();
    }

    @Get('round-2/encryption')
    @ApiTags('Storage')
    getRound2EncryptionTreeLevel1(): MerkleLeaf[] {
        return this.storagesService.getRound2EncryptionTreeLevel1();
    }
}
