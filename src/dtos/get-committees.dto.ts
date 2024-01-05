import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MemberRoleEnum } from 'src/constants';

export class GetCommitteesDto {
    @IsString()
    @IsOptional()
    member?: string;

    @IsEnum(MemberRoleEnum)
    @Type(() => Number)
    @IsOptional()
    @ApiProperty({ description: 'OWNER | MEMBER | NONE' })
    role?: number;
}
