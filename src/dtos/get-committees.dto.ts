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
    role?: number;
}
