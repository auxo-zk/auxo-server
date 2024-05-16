import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class GetRequestsDto {
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    committeeId?: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    keyIndex?: number;
}
