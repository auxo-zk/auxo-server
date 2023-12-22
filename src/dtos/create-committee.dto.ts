export class CreateCommitteeDto {
    name: string;
    creator: string;
    threshold: number;
    members: Member[];
}

class Member {
    memberId: number;
    alias: string;
    publicKey: string;
}
