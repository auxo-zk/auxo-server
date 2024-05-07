import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';

class CommitteeMember {
    @IsNumber()
    memberId: number;

    @IsString()
    alias: string;

    @IsString()
    publicKey: string;
}

export class CreateCommitteeDto {
    @IsString()
    name: string;

    @IsString()
    creator: string;

    @IsNumber()
    threshold: number;

    @ValidateNested()
    @Type(() => CommitteeMember)
    members: CommitteeMember[];
}
