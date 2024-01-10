import { IsString, IsUrl } from 'class-validator';

export class UpdateBuilderDto {
    @IsString()
    name: string;

    @IsString()
    role: string;

    @IsUrl()
    link: string;

    @IsString()
    description: string;
}
