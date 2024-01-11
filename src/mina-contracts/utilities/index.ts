import mongoose, { ObjectId } from 'mongoose';
import { AccountUpdate, Field } from 'o1js';
export class Utilities {
    static stringArrayToFields(input: string[]): Field[] {
        const result: Field[] = [];
        for (let i = 0; i < input.length; i++) {
            result.push(Field(input[i]));
        }
        return result;
    }

    static fieldsToStringArray(input: Field[]): string[] {
        const result: string[] = [];
        for (let i = 0; i < input.length; i++) {
            result.push(input[i].toString());
        }
        return result;
    }

    static getActionHash(actions: Field[][]): Field {
        return AccountUpdate.Actions.hash(actions);
    }

    static getNextActionState(currentState: Field, actionHash: Field): Field {
        return AccountUpdate.Actions.updateSequenceState(
            currentState,
            actionHash,
        );
    }

    static getKeyObjectId(committeeId: number, keyId: number): ObjectId {
        return new mongoose.Schema.Types.ObjectId(committeeId + '_' + keyId);
    }
}
