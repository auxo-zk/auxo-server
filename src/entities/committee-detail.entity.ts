import { Committee } from 'src/schemas/committee.schema';

export class CommitteeDetail {
    committeeIndex: number;
    numberOfMembers: number;
    threshold: number;
    members: Member[];
    active: boolean;
    ipfsHash: string;
    ipfsData: { name: string; creator: string; network: string };

    constructor(committee: Committee) {
        this.committeeIndex = committee.committeeIndex;
        this.numberOfMembers = committee.numberOfMembers;
        this.threshold = committee.threshold;
        this.active = committee.active;
        this.ipfsHash = committee.ipfsHash;
        this.members = [];
        for (let i = 0; i < committee.publicKeys.length; i++) {
            this.members.push(
                new Member(committee.publicKeys[i], 'default', new Date()),
            );
        }
    }
}

class Member {
    publicKey: string;
    alias: string;
    lastActive: Date;

    constructor(publicKey: string, alias: string, lastActive: Date) {
        this.publicKey = publicKey;
        this.alias = alias;
        this.lastActive = lastActive;
    }
}
