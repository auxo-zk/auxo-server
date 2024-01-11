import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class UpdateDraftDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    publicKey?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    problemStatement?: string;

    @IsString()
    @IsOptional()
    solution?: string;

    @IsString()
    @IsOptional()
    challengeAndRisks?: string;

    @Type(() => Member)
    @ValidateNested({ each: true })
    @IsOptional()
    @IsArray()
    members?: Member[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    documents?: string[];
}

class Member {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    role?: string;

    @IsString()
    @IsOptional()
    link?: string;
}
