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
import { CommitteeDetail } from 'src/entities/committee-detail.entity';
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
    async getAllCommittees(): Promise<CommitteeDetail[]> {
        const committees = await this.committeeModel.find({});
        const result: CommitteeDetail[] = new Array(committees.length);
        const ipfsData = await Promise.all(
            [...Array(committees.length).keys()].map((i: any) =>
                this.ipfs.getData(committees[i].ipfsHash),
            ),
        );
        for (let i = 0; i < committees.length; i++) {
            const committee = committees[i];
            const committeeDetail = new CommitteeDetail(committee);
            committeeDetail.ipfsData = ipfsData[i] as any;
            result[committee.committeeId] = committeeDetail;
        }
        return result;
    }

    @Get(':committeeId')
    @ApiTags('Committee')
    async getCommittee(
        @Param('committeeId') committeeId: number,
    ): Promise<CommitteeDetail> {
        const result = await this.committeeModel.findOne({
            committeeId: committeeId,
        });
        if (result == null) {
            throw new NotFoundException();
        }
        const ipfsData = await this.ipfs.getData(result.ipfsHash);
        const committeeDetail = new CommitteeDetail(result);
        committeeDetail.ipfsData = ipfsData as any;
        return committeeDetail;
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