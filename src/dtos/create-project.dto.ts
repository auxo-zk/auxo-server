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
    @Type(() => Member)
    members: Member[];

    @IsArray({ each: true })
    documents: string[];
}

class Member {
    @IsString()
    name: string;

    @IsString()
    role: string;

    @IsString()
    link: string;
}
