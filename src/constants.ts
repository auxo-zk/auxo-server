export const enum CommitteeEventEnum {
    COMMITTEE_CREATED,
    __LENGTH,
}

export const enum DkgEventEnum {
    KEY_UPDATES_REDUCED,
    __LENGTH,
}

export const enum DkgActionEnum {
    GENERATE_KEY,
    FINALIZE_ROUND_1,
    FINALIZE_ROUND_2,
    DEPRECATE_KEY,
    __LENGTH,
}

export const enum RequestActionEnum {
    REQUEST,
    UNREQUEST,
    RESOLVE,
    __LENGTH,
}

export const enum RequestStatus {
    NOT_YET_REQUESTED,
    REQUESTING,
    RESOLVED,
}

export enum RequestEventEnum {
    ACTION_REDUCED,
    CREATE_REQUEST,
}

export const enum KeyStatus {
    EMPTY,
    ROUND_1_CONTRIBUTION,
    ROUND_2_CONTRIBUTION,
    ACTIVE,
    DEPRECATED,
}

export const jwtConstants = {
    secret: 'vkl',
};

// ms
export const authTimeLimit = 120 * 1000;

export enum AuthRole {
    BUILDER,
    ORGANIZER,
    INVESTOR,
}

export enum MemberRole {
    OWNER,
    MEMBER,
    NONE,
}
