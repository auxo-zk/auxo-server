import { Field } from 'o1js';

export interface CommitteeState {
    nextCommitteeId: Field;
    committeeTreeRoot: Field;
    settingTreeRoot: Field;
    actionState: Field;
}

export interface DkgState {
    zkApp: Field;
    keyCounter: Field;
    keyStatus: Field;
}

export interface Round1State {
    zkApp: Field;
    reduceState: Field;
    contribution: Field;
    publicKey: Field;
}

export interface Round2State {
    zkApp: Field;
    reduceState: Field;
    contribution: Field;
    encryption: Field;
}

export interface DkgRequestState {
    requestStatus: Field;
    requester: Field;
    actionState: Field;
    responseContractAddress: Field;
}

export interface DkgResponseState {
    zkApp: Field;
    reduceState: Field;
    contribution: Field;
}
