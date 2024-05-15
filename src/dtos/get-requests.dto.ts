import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class GetRequestsDto {
    @Type(() => Number)
    @IsOptional()
    committeeId?: number;

    @Type(() => Number)
    @IsOptional()
    keyId?: number;
}
