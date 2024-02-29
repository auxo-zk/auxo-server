import { Type } from 'class-transformer';
import {
    IsArray,
    IsOptional,
    IsString,
    IsUrl,
    ValidateNested,
} from 'class-validator';

export class ProjectMember {
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

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProjectMember)
    @IsOptional()
    members?: ProjectMember[];

    @IsArray()
    @IsUrl({}, { each: true })
    @IsOptional()
    documents?: string[];
}
