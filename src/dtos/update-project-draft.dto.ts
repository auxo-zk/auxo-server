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
    name: string;

    @IsString()
    role: string;

    @IsString()
    link: string;
}

export class UpdateProjectDraftDto {
    @IsString()
    name: string;

    @IsUrl()
    avatarImage: string;

    @IsUrl()
    coverImage: string;

    @IsString()
    publicKey: string;

    @IsString()
    description: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProjectMember)
    members: ProjectMember[];

    @IsArray()
    @IsUrl({}, { each: true })
    documents: string[];
}
