import { Key } from 'src/schemas/key.schema';
import { Round1 } from 'src/schemas/round-1.schema';
import { Round2 } from 'src/schemas/round-2.schema';
export class KeyDetail {
    committeeId: number;
    keyId: number;
    status: number;
    round1Contributions: { [key: number]: { x: string; y: string }[] };
    round2Contributions: {
        [key: number]: { c: string[]; u: { x: string; y: string }[] };
    };

    constructor(key: Key, round1s: Round1[], round2s: Round2[]) {
        this.committeeId = key.committeeId;
        this.keyId = key.keyId;
        this.status = key.status;
        this.round1Contributions = {};
        this.round2Contributions = {};
        for (let i = 0; i < round1s.length; i++) {
            this.round1Contributions[round1s[i].memberId] =
                round1s[i].contribution;
        }
        for (let i = 0; i < round2s.length; i++) {
            this.round2Contributions[round2s[i].memberId] =
                round2s[i].contribution;
        }
    }
}
