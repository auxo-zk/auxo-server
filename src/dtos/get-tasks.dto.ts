import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GetTasksDto {
    @IsString()
    @IsOptional()
    requester: string;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    keyIndex?: number;
}
