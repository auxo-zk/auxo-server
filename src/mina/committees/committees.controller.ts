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
import { IpfsResponse } from 'src/interfaces/ipfs-response.interface';
import { Ipfs } from 'src/ipfs/ipfs';
import { Committee } from 'src/schemas/committee.schema';

@Controller('committees')
export class CommitteesController {
    constructor(
        private readonly ipfs: Ipfs,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
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
}
