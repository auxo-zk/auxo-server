import { Field } from 'o1js';

export interface CommitteeState {
    nextCommitteeId: Field;
    committeeTreeRoot: Field;
    settingTreeRoot: Field;
    actionState: Field;
}
