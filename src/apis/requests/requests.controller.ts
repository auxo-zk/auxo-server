import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    UseInterceptors,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { DkgRequest } from 'src/schemas/request.schema';

@Controller('requests')
export class RequestsController {
    constructor(private readonly requestsService: RequestsService) {}

    @Get()
    @ApiTags('Request')
    @CacheTTL(30000)
    @UseInterceptors(CacheInterceptor)
    async getRequests(): Promise<DkgRequest[]> {
        return await this.requestsService.getRequests();
    }

    @Get(':requestId')
    @ApiTags('Request')
    async getRequest(
        @Param('requestId', ParseIntPipe) requestId: number,
    ): Promise<DkgRequest> {
        return await this.requestsService.getRequest(requestId);
    }
}
