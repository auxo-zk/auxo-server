import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { GetKeyQuery } from 'src/dtos/get-key-query.dto';
import { Key } from 'src/schemas/key.schema';
import { Utilities } from '../utilities';
import { Response } from 'express';

@Controller('key')
export class KeyController {
    constructor(
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
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
    async getKeyDetails(
        @Query() query: GetKeyQuery,
        @Res() response: Response,
    ) {
        const keyObjectId = Utilities.getKeyObjectId(
            query.committeeId,
            query.keyId,
        );
        const existed = await this.keyModel.exists({ _id: keyObjectId });
        if (existed) {
        } else {
        }
        // console.log(query);
        // const keys = await this.keyModel.find({});
        // return keys;
    }
}
