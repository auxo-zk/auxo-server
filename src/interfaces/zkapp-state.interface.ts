import { Field } from 'o1js';

export interface CommitteeState {
    nextCommitteeId: Field;
    memberRoot: Field;
    settingRoot: Field;
    zkAppRoot: Field;
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
    nextCampaignId: Field;
    timelineRoot: Field;
    ipfsHashRoot: Field;
    keyIndexRoot: Field;
    zkAppRoot: Field;
    actionState: Field;
}

export interface ProjectState {
    nextProjectId: Field;
    memberRoot: Field;
    ipfsHashRoot: Field;
    treasuryAddressRoot: Field;
    actionState: Field;
}
export interface ParticipationState {
    projectIndexRoot: Field;
    projectCounterRoot: Field;
    ipfsHashRoot: Field;
    zkAppRoot: Field;
    actionState: Field;
}

export interface FundingState {
    nextFundingId: Field;
    fundingInformationRoot: Field;
    zkAppRoot: Field;
    actionState: Field;
}

export interface TreasuryManagerState {
    campaignStateRoot: Field;
    claimedIndexRoot: Field;
    zkApp: Field;
    actionState: Field;
}
