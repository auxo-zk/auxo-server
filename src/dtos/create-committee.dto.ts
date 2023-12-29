import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Member } from 'src/schemas/committee.schema';

export class CreateCommitteeDto {
    @IsString()
    name: string;

    @IsString()
    creator: string;

    @IsNumber()
    threshold: number;

    @ValidateNested()
    @Type(() => Member)
    members: Member[];
}
