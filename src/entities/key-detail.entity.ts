import { KeyStatus } from 'src/schemas/key.schema';

export class KeyDetail {
    committeeId: number;
    keyId: number;
    status: KeyStatus;
    // round1Contributions: { [key: 'string']: number };
    round2Contributions: [];
}
