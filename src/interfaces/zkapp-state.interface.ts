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

export interface CampaignState {
    owner: Field;
    info: Field;
    status: Field;
    config: Field;
    zkApp: Field;
    nextCampaignId: Field;
    actionState: Field;
}

export interface ProjectState {
    nextProjectId: Field;
    member: Field;
    info: Field;
    payee: Field;
    actionState: Field;
}
export interface ParticipationState {
    index: Field;
    info: Field;
    counter: Field;
    zkApp: Field;
    actionState: Field;
}

export interface FundingState {
    actionState: Field;
    reduceState: Field;
    R: Field;
    M: Field;
    requestId: Field;
    zkApp: Field;
}

export interface TreasuryState {
    claimed: Field;
    zkApp: Field;
    actionState: Field;
}
