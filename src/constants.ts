import { Cache, Mina } from 'o1js';

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

export enum MemberRoleEnum {
    OWNER,
    MEMBER,
    NONE,
}

export const zkAppCache = Cache.FileSystem(process.env.CACHE_DIR);

export enum ZkAppEnum {
    COMMITTEE,
    DKG,
    ROUND1,
    ROUND2,
    REQUEST,
    REQUESTER,
    RESPONSE,
    ROLLUP,
    PROJECT,
    CAMPAIGN,
    PARTICIPATION,
    FUNDING,
    TREASURY,
}

export enum DkgZkAppIndex {
    ROLLUP,
    COMMITTEE,
    DKG,
    ROUND1,
    ROUND2,
    RESPONSE,
    REQUEST,
    __LENGTH,
}

export const MaxRetries = 5;

export const BerkeleyNetwork = Mina.Network({
    mina: process.env.BERKELEY_MINA,
    archive: process.env.BERKELEY_ARCHIVE,
});

export const Lightnet = Mina.Network({
    mina: process.env.LIGHTNET_MINA,
    archive: process.env.LIGHTNET_ARCHIVE,
    lightnetAccountManager: process.env.LIGHTNET_ACCOUNT_MANAGER,
});

export const MinaScanNetwork = Mina.Network({
    mina: process.env.MINA_SCAN_MINA,
    archive: process.env.MINA_SCAN_ARCHIVE,
});
