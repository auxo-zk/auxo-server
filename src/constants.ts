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

export const enum RequestStatusEnum {
    NOT_YET_REQUESTED,
    REQUESTING,
    // RESOLVED, this will be hash of request vector D: H(length + values)
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
