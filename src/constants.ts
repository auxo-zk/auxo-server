import { Constants } from '@auxo-dev/dkg';
import { Cache, Mina } from 'o1js';
import _, { last } from 'lodash';

export enum CommitteeEventEnum {
    COMMITTEE_CREATED,
    __LENGTH,
}

export enum DkgEventEnum {
    KEY_UPDATES_REDUCED,
    __LENGTH,
}

export enum EventEnum {
    PROCESSED,
    ROLLUPED,
}

export enum FundingEventEnum {
    ACTIONS_REDUCED,
    REQUEST_SENT,
}

export enum DkgActionEnum {
    GENERATE_KEY,
    FINALIZE_ROUND_1,
    FINALIZE_ROUND_2,
    DEPRECATE_KEY,
    __LENGTH,
}

export enum ActionReduceStatusEnum {
    NOT_EXISTED,
    REDUCED,
}

export enum RequestActionEnum {
    REQUEST,
    UNREQUEST,
    RESOLVE,
    __LENGTH,
}

export enum RequestStatusEnum {
    INITIALIZED,
    RESOLVED,
    EXPIRED,
}

export enum RequestEventEnum {
    ACTION_REDUCED,
    CREATE_REQUEST,
}

export enum ProjectActionEnum {
    CREATE_PROJECT,
    UPDATE_PROJECT,
}

export enum CampaignActionEnum {
    CREATE_CAMPAIGN,
    UPDATE_CAMPAIGN,
}

export enum CampaignStateEnum {
    NOT_ENDED,
    COMPLETED,
    ABORTED,
}

export enum FundingStateEnum {
    FUNDED,
    REFUNDED,
}

export enum KeyStatusEnum {
    EMPTY,
    ROUND_1_CONTRIBUTION,
    ROUND_2_CONTRIBUTION,
    ACTIVE,
    DEPRECATED,
}

export const enum CampaignStatusEnum {
    NOT_STARTED,
    APPLICATION,
    FUNDING,
    ALLOCATED,
    FINALIZE_ROUND_1,
    __LENGTH,
}

// ms
export const authTimeLimit = 120 * 1000;

export enum AuthRoleEnum {
    BUILDER,
    ORGANIZER,
    INVESTOR,
}

export enum CommitteeMemberRoleEnum {
    OWNER,
    MEMBER,
    NONE,
}

export const ZkAppCache = Cache.FileSystem(process.env.CACHE_DIR);

export enum ZkAppIndex {
    ROLLUP,
    COMMITTEE,
    DKG,
    ROUND1,
    ROUND2,
    RESPONSE,
    REQUEST,
    PROJECT,
    CAMPAIGN,
    PARTICIPATION,
    FUNDING,
    TREASURY_MANAGER,
    FUNDING_REQUESTER,
    __LENGTH,
}

export const MaxRetries = 5;

export const RequesterAddresses = [
    process.env.FUNDING_REQUESTER_ADDRESS as string,
];
// export const RequesterAddresses = [process.env.FUNDING_REQUESTER];

const RequesterAddressMapping: {
    [key: string]: { taskManagerAddress: string; submissionAddress: string };
} = {};

RequesterAddressMapping[process.env.FUNDING_REQUESTER_ADDRESS as string] = {
    taskManagerAddress: process.env.CAMPAIGN_ADDRESS as string,
    submissionAddress: process.env.FUNDING_ADDRESS as string,
};

export function getFullDimensionEmptyGroupVector(): {
    x: string;
    y: string;
}[] {
    const FullDimensionEmptyGroupVector: { x: string; y: string }[] = [];
    for (let i = 0; i < Constants.ENCRYPTION_LIMITS.FULL_DIMENSION; i++) {
        FullDimensionEmptyGroupVector.push({
            x: '0',
            y: '0',
        });
    }
    return FullDimensionEmptyGroupVector;
}
export { RequesterAddressMapping };
