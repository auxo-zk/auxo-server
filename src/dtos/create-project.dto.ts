import { Type } from 'class-transformer';
import { IsArray, IsString, IsUrl, ValidateNested } from 'class-validator';
import { FileInformation } from 'src/entities/file-information.entity';

class ProjectMember {
    @IsString()
    name: string;

    @IsString()
    role: string;

    @IsString()
    link: string;

    @IsString()
    publicKey: string;
}

export class CreateProjectDto {
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
    @ValidateNested({ each: true })
    @Type(() => FileInformation)
    documents: FileInformation[];
}
