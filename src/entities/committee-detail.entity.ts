import { Committee } from 'src/schemas/committee.schema';

export class CommitteeDetail {
    committeeIndex: number;
    numberOfMembers: number;
    threshold: number;
    publicKeys: PublicKey[];
    active: boolean;
    ipfsHash: string;
    ipfsData: { name: string; creator: string; network: string };

    constructor(committee: Committee) {
        this.committeeIndex = committee.committeeIndex;
        this.numberOfMembers = committee.numberOfMembers;
        this.threshold = committee.threshold;
        this.active = committee.active;
        this.ipfsHash = committee.ipfsHash;
        this.publicKeys = [];
        for (let i = 0; i < committee.publicKeys.length; i++) {
            this.publicKeys.push(
                new PublicKey(committee.publicKeys[i], 'default', new Date()),
            );
        }
    }
}

class PublicKey {
    address: string;
    alias: string;
    lastActive: Date;

    constructor(address: string, alias: string, lastActive: Date) {
        this.address = address;
        this.alias = alias;
        this.lastActive = lastActive;
    }
}
