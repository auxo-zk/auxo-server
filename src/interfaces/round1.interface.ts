import { Round1Contribution } from 'src/schemas/key.schema';

export interface Round1 {
    actionId: number;
    committeeId: number;
    keyId: number;
    memberId: number;
    contribution: Round1Contribution;
}
