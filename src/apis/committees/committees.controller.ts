import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UseInterceptors,
} from '@nestjs/common';
import { CommitteesService } from './committees.service';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { GetCommitteesDto } from 'src/dtos/get-committees.dto';
import { Committee } from 'src/schemas/committee.schema';
import { IpfsResponse } from 'src/entities/ipfs-response.entity';
import { CreateCommitteeDto } from 'src/dtos/create-committee.dto';
import { DkgRequest } from 'src/schemas/request.schema';
import { Key } from 'src/schemas/key.schema';

@Controller('committees')
export class CommitteesController {
    constructor(private readonly committeesService: CommitteesService) {}

    @Get()
    @ApiTags('Committee')
    @CacheTTL(30000)
    @UseInterceptors(CacheInterceptor)
    async getCommittees(
        @Query() getCommitteesDto: GetCommitteesDto,
    ): Promise<Committee[]> {
        return await this.committeesService.getCommittees(getCommitteesDto);
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

    @Get(':committeeId/requests')
    @ApiTags('Committee')
    async getRequests(
        @Param('committeeId', ParseIntPipe) committeeId: number,
    ): Promise<DkgRequest[]> {
        return await this.committeesService.getRequests(committeeId);
    }
}
