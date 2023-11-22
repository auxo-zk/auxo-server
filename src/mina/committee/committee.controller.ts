import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Param,
    Post,
    Res,
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

@Controller('committee')
export class CommitteeController {
    constructor(
        private readonly ipfs: Ipfs,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {}

    @Get()
    @ApiTags('Committee')
    async getAllCommittees(): Promise<CommitteeDetail[]> {
        const committees = await this.committeeModel.find({});
        const result: CommitteeDetail[] = [];
        const ipfsData = await Promise.all(
            [...Array(committees.length).keys()].map((i: any) =>
                this.ipfs.getData(committees[i].ipfsHash),
            ),
        );
        for (let i = 0; i < committees.length; i++) {
            const committee = committees[i];
            const committeeDetail = new CommitteeDetail(committee);
            committeeDetail.ipfsData = ipfsData[i] as any;
            result.push(committeeDetail);
        }
        return result;
    }

    @Get(':committeeIndex')
    @ApiTags('Committee')
    async getCommittee(
        @Param('committeeIndex') committeeIndex: number,
        @Res() response: Response,
    ): Promise<CommitteeDetail> {
        const result = await this.committeeModel.findOne({
            committeeIndex: committeeIndex,
        });
        if (result == null) {
            response.status(HttpStatus.NOT_FOUND);
        }
        const ipfsData = await this.ipfs.getData(result.ipfsHash);
        const committeeDetail = new CommitteeDetail(result);
        committeeDetail.ipfsData = ipfsData as any;
        response.send(committeeDetail);
        return committeeDetail;
    }

    @Post()
    @ApiTags('Committee')
    async createCommittee(
        @Body() createCommitteeDto: CreateCommitteeDto,
        @Res() response: Response,
    ): Promise<IpfsResponse> {
        const result = await this.ipfs.upload(createCommitteeDto);
        if (result == null) {
            response.status(HttpStatus.BAD_REQUEST);
        }
        response.send(result);
        return result;
    }
}
