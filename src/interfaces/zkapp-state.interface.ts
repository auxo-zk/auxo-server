import { Field } from 'o1js';

export interface CommitteeState {
    zkAppRoot: Field;
    nextCommitteeId: Field;
    memberRoot: Field;
    settingRoot: Field;
    feeRoot: Field;
    feeReceiverRoot: Field;
    actionState: Field;
}

export interface DkgState {
    zkAppRoot: Field;
    keyCounterRoot: Field;
    keyStatusRoot: Field;
    keyRoot: Field;
    processRoot: Field;
}

export interface Round1State {
    zkAppRoot: Field;
    contributionRoot: Field;
    publicKeyRoot: Field;
    processRoot: Field;
}

export interface Round2State {
    zkAppRoot: Field;
    contributionRoot: Field;
    encryptionRoot: Field;
    processRoot: Field;
}

export interface DkgRequestState {
    zkAppRoot: Field;
    requestCounter: Field;
    keyIndexRoot: Field;
    taskRoot: Field;
    accumulationRoot: Field;
    expirationRoot: Field;
    resultRoot: Field;
    actionState: Field;
}

export interface DkgResponseState {
    zkAppRoot: Field;
    contributionRoot: Field;
    responseRoot: Field;
    processRoot: Field;
}

export interface RequesterState {
    zkAppRoot: Field;
    counters: Field;
    keyIndexRoot: Field;
    timestampRoot: Field;
    accumulationRoot: Field;
    commitmentRoot: Field;
    lastTimestamp: Field;
    actionState: Field;
}

export interface RollupState {
    zkAppRoot: Field;
    counterRoot: Field;
    rollupRoot: Field;
    actionState: Field;
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

export interface NullifierState {
    nullifierRoot: Field;
    actionState: Field;
}
