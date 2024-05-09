import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { MethodInputsService } from './method-inputs.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('method-inputs')
export class MethodInputsController {
    constructor(private readonly methodInputsService: MethodInputsService) {}

    @Get('dkg-contract/generate-key')
    @ApiTags('Method Inputs')
    async getDkgContractGenerateKey(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('memberId', new ParseIntPipe()) memberId: number,
    ) {
        return this.methodInputsService.getDkgContractGenerateKey(
            committeeId,
            memberId,
        );
    }

    @Get('round1-contract/contribute')
    @ApiTags('Method Inputs')
    async getRound1ContractContribute(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('memberId', new ParseIntPipe()) memberId: number,
    ) {
        return this.methodInputsService.getRound1ContractContribute(
            committeeId,
            memberId,
        );
    }

    @Get('round1-contract/finalize')
    @ApiTags('Method Inputs')
    async getRound1ContractFinalize(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('keyId', new ParseIntPipe()) keyId: number,
    ) {
        return this.methodInputsService.getRound1ContractFinalize(
            committeeId,
            keyId,
        );
    }

    @Get('round2-contract/contribute')
    @ApiTags('Method Inputs')
    async getRound2ContractContribute(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('keyId', new ParseIntPipe()) keyId: number,
        @Query('memberId', new ParseIntPipe()) memberId: number,
    ) {
        return this.methodInputsService.getRound2ContractContribute(
            committeeId,
            keyId,
            memberId,
        );
    }

    @Get('round2-contract/finalize')
    @ApiTags('Method Inputs')
    async getRound2ContractFinalize(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('keyId', new ParseIntPipe()) keyId: number,
    ) {
        return this.methodInputsService.getRound2ContractFinalize(
            committeeId,
            keyId,
        );
    }

    @Get('response-contract/contribute')
    @ApiTags('Method Inputs')
    async getResponseContractContribute(
        @Query('committeeId', new ParseIntPipe()) committeeId: number,
        @Query('memberId', new ParseIntPipe()) memberId: number,
        @Query('keyId', new ParseIntPipe()) keyId: number,
        @Query('requestId', new ParseIntPipe()) requestId: number,
    ) {
        return this.methodInputsService.getResponseContractContribute(
            committeeId,
            memberId,
            keyId,
            requestId,
        );
    }
}
