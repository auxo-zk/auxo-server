import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpStatus,
    NotFoundException,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Model } from 'mongoose';
import { MemberRole } from 'src/constants';
import { CreateCommitteeDto } from 'src/dtos/create-committee.dto';
import { GetCommitteesDto } from 'src/dtos/get-committees.dto';
import { KeyDetail } from 'src/entities/key-detail.entity';
import { IpfsResponse } from 'src/interfaces/ipfs-response.interface';
import { Ipfs } from 'src/ipfs/ipfs';
import { Committee } from 'src/schemas/committee.schema';
import { Key } from 'src/schemas/key.schema';
import { Round1 } from 'src/schemas/round-1.schema';
import { Round2 } from 'src/schemas/round-2.schema';
import { CommitteesService } from './committees.service';

@Controller('committees')
export class CommitteesController {
    constructor(
        private readonly ipfs: Ipfs,
        private readonly committeesService: CommitteesService,
    ) {}

    @Get()
    @ApiTags('Committee')
    @CacheTTL(30000)
    @UseInterceptors(CacheInterceptor)
    async getAllCommittees(
        @Query() getCommitteesDto: GetCommitteesDto,
    ): Promise<Committee[]> {
        return await this.committeesService.getAllCommittees(getCommitteesDto);
    }

    @Post()
    @ApiTags('Committee')
    async createCommittee(
        @Body() createCommitteeDto: CreateCommitteeDto,
    ): Promise<IpfsResponse> {
        return await this.committeesService.createCommittee(createCommitteeDto);
    }

    @Get(':committeeId')
    @ApiTags('Committee')
    async getCommittee(
        @Param('committeeId', ParseIntPipe) committeeId: number,
    ): Promise<Committee> {
        return await this.committeesService.getCommittee(committeeId);
    }

    @Get(':committeeId/keys')
    @ApiTags('Committee')
    async getKeys(
        @Param('committeeId', ParseIntPipe) committeeId: number,
    ): Promise<Key[]> {
        return await this.committeesService.getKeys(committeeId);
    }
}
