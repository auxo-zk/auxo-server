import { Type } from 'class-transformer';
import {
    IsArray,
    IsOptional,
    IsString,
    IsUrl,
    ValidateNested,
} from 'class-validator';
import { FileInformation } from 'src/entities/file-information.entity';

class ProjectMember {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    role?: string;

    @IsString()
    @IsOptional()
    link?: string;

    @IsString()
    @IsOptional()
    publicKey?: string;
}

export class CreateProjectDraftDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsUrl()
    @IsOptional()
    avatarImage?: string;

    @IsUrl()
    @IsOptional()
    coverImage?: string;

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
    challengeAndRisk?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProjectMember)
    @IsOptional()
    members?: ProjectMember[];

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => FileInformation)
    documents?: FileInformation[];
}
