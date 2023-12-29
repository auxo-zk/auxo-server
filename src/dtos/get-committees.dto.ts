import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthRole, MemberRole } from 'src/constants';

export class GetCommitteesDto {
    @IsString()
    @IsOptional()
    member?: string;

    @IsEnum(MemberRole)
    @Type(() => Number)
    @IsOptional()
    @ApiProperty({ description: 'OWNER | MEMBER | NONE' })
    role?: number;
}
