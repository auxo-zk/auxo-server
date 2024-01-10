export enum CommitteeEventEnum {
    COMMITTEE_CREATED,
    __LENGTH,
}

export enum DkgEventEnum {
    KEY_UPDATES_REDUCED,
    __LENGTH,
}

export enum DkgActionEnum {
    GENERATE_KEY,
    FINALIZE_ROUND_1,
    FINALIZE_ROUND_2,
    DEPRECATE_KEY,
    __LENGTH,
}

export enum RequestActionEnum {
    REQUEST,
    UNREQUEST,
    RESOLVE,
    __LENGTH,
}

export enum RequestStatusEnum {
    NOT_YET_REQUESTED,
    REQUESTING,
    RESOLVED,
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
