import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateDraftDto {
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
    @ValidateNested()
    @IsOptional()
    members?: Member[];

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
