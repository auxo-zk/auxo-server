import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class GetProjectsDto {
    @IsOptional()
    @Type(() => String)
    @ApiProperty({ description: 'ADDRESS' })
    member?: string;
}
