import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Query,
    UseInterceptors,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { DkgRequest } from 'src/schemas/request.schema';
import { GetRequestsDto } from 'src/dtos/get-requests.dto';

@Controller('requests')
export class RequestsController {
    constructor(private readonly requestsService: RequestsService) {}

    @Get()
    @ApiTags('Request')
    @CacheTTL(30000)
    @UseInterceptors(CacheInterceptor)
    async getRequests(
        @Query() getRequestsDto: GetRequestsDto,
    ): Promise<DkgRequest[]> {
        return await this.requestsService.getRequests(getRequestsDto);
    }

    @Get(':requestId')
    @ApiTags('Request')
    async getRequest(
        @Param('requestId', ParseIntPipe) requestId: number,
    ): Promise<DkgRequest> {
        return await this.requestsService.getRequest(requestId);
    }
}
