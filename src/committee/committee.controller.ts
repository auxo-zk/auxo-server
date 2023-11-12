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
    async getAllCommittees(): Promise<Committee[]> {
        return this.committeeModel.find({});
    }

    @Get(':committeeId')
    @ApiTags('Committee')
    async getCommittee(
        @Param('committeeId') committeeId: number,
        @Res() response: Response,
    ): Promise<Committee> {
        const result = await this.committeeModel.findOne({
            committeeId: committeeId,
        });
        if (result == null) {
            response.status(HttpStatus.NOT_FOUND);
        }
        response.send(result);
        return result;
    }

    @Post()
    @ApiTags('Committee')
    async createCommittee(
        @Body() createCommitteeDto: CreateCommitteeDto,
    ): Promise<IpfsResponse> {
        const response = this.ipfs.upload(createCommitteeDto);
        return response;
    }
}
