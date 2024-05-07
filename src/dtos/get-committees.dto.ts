import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommitteeMemberRoleEnum } from 'src/constants';

export class GetCommitteesDto {
    @IsString()
    @IsOptional()
    member?: string;

    @IsEnum(CommitteeMemberRoleEnum)
    @Type(() => Number)
    @IsOptional()
    @ApiProperty({ enum: CommitteeMemberRoleEnum })
    role?: number;
}
