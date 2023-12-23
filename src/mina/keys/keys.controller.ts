import { CacheTTL } from '@nestjs/cache-manager';
import {
    Controller,
    Get,
    HttpStatus,
    NotFoundException,
    Query,
    Res,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { GetKeyQuery } from 'src/dtos/get-key-query.dto';
import { Key } from 'src/schemas/key.schema';
import { Utilities } from '../utilities';
import { Response } from 'express';
import { Round1 } from 'src/schemas/round-1.schema';
import { Round2 } from 'src/schemas/round-2.schema';
import { KeyDetail } from 'src/entities/key-detail.entity';

@Controller('keys')
export class KeysController {
    constructor(
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(Round1.name)
        private readonly round1Model: Model<Round1>,
        @InjectModel(Round2.name)
        private readonly round2Model: Model<Round2>,
    ) {}

    @Get()
    @ApiTags('Key')
    @CacheTTL(30000)
    async getAllKeys(): Promise<Key[]> {
        const keys = await this.keyModel.find({});
        return keys;
    }

    @Get('/detail')
    @ApiTags('Key')
    async getKeyDetails(@Query() query: GetKeyQuery) {
        const keyObjectId = Utilities.getKeyObjectId(
            query.committeeId,
            query.keyId,
        );
        const existed = await this.keyModel.exists({ _id: keyObjectId });
        if (existed) {
            const key = await this.keyModel.findOne({ _id: keyObjectId });
            const round1s = await this.round1Model.find({
                committeeId: query.committeeId,
                keyId: query.keyId,
            });
            const round2s = await this.round2Model.find({
                committeeId: query.committeeId,
                keyId: query.keyId,
            });
            const keyDetail = new KeyDetail(key, round1s, round2s);
            return keyDetail;
        } else {
            throw new NotFoundException();
        }
    }
}
