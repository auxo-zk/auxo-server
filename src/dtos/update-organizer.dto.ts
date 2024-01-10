import { IsString, IsUrl } from 'class-validator';

export class UpdateOrganizerDto {
    @IsString()
    name: string;

    @IsUrl()
    website: string;

    @IsString()
    description: string;
}
