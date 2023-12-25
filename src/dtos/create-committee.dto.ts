import { Member } from 'src/schemas/committee.schema';

export class CreateCommitteeDto {
    name: string;
    creator: string;
    threshold: number;
    members: Member[];
}
