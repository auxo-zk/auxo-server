import { Field } from 'o1js';

export interface CommitteeState {
    committeeTreeRoot: Field;
    settingTreeRoot: Field;
    nextCommitteeId: Field;
    actionState: Field;
}
