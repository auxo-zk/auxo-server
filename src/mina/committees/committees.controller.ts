import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Model } from 'mongoose';
import { CreateCommitteeDto } from 'src/dtos/create-committee.dto';
import { KeyDetail } from 'src/entities/key-detail.entity';
import { IpfsResponse } from 'src/interfaces/ipfs-response.interface';
import { Ipfs } from 'src/ipfs/ipfs';
import { Committee } from 'src/schemas/committee.schema';
import { Key } from 'src/schemas/key.schema';
import { Round1 } from 'src/schemas/round-1.schema';
import { Round2 } from 'src/schemas/round-2.schema';

@Controller('committees')
export class CommitteesController {
    constructor(
        private readonly ipfs: Ipfs,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(Round1.name)
        private readonly round1Model: Model<Round1>,
        @InjectModel(Round2.name)
        private readonly round2Model: Model<Round2>,
    ) {}

    @Get()
    @ApiTags('Committee')
    @CacheTTL(30000)
    @UseInterceptors(CacheInterceptor)
    async getAllCommittees(): Promise<Committee[]> {
        const committees = await this.committeeModel.find({});
        return committees;
    }

    @Get(':committeeId')
    @ApiTags('Committee')
    async getCommittee(
        @Param('committeeId') committeeId: number,
    ): Promise<Committee> {
        const result = await this.committeeModel.findOne({
            committeeId: committeeId,
        });
        if (result == null) {
            throw new NotFoundException();
        }
        return result;
    }

    @Post()
    @ApiTags('Committee')
    async createCommittee(
        @Body() createCommitteeDto: CreateCommitteeDto,
    ): Promise<IpfsResponse> {
        const result = await this.ipfs.upload(createCommitteeDto);
        if (result == null) {
            throw new BadRequestException();
        }
        return result;
    }

    @Get(':committeeId/keys')
    @ApiTags('Committee')
    async getKeys(
        @Param('committeeId') committeeId: number,
    ): Promise<KeyDetail[]> {
        const keys = await this.keyModel.find({
            committeeId: committeeId,
        });
        const result: KeyDetail[] = [];
        for (let i = 0; i < keys.length; i++) {
            const keyId = keys[i].keyId;
            const round1s = await this.round1Model.find({
                committeeId: committeeId,
                keyId: keyId,
            });
            const round2s = await this.round2Model.find({
                committeeId: committeeId,
                keyId: keyId,
            });
            const keyDetail = new KeyDetail(keys[i], round1s, round2s);
            result.push(keyDetail);
        }
        return result;
    }
}
