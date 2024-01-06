import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

export class CreateProjectDto {
    @IsString()
    name: string;

    @IsString()
    img: string;

    @IsString()
    publicKey: string;

    @IsString()
    description: string;

    @ValidateNested()
    @Type(() => ProjectMember)
    members: ProjectMember[];

    @IsArray()
    @IsString({ each: true })
    documents: string[];
}

export class ProjectMember {
    @IsString()
    name: string;

    @IsString()
    role: string;

    @IsString()
    link: string;
}
