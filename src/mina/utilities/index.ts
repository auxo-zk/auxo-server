import { AccountUpdate, Field } from 'o1js';
import * as bcrypt from 'bcrypt';
export class Utilities {
    static stringArrayToFields(input: string[]): Field[] {
        const result: Field[] = [];
        for (let i = 0; i < input.length; i++) {
            result.push(Field(input[i]));
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

    static hash(input: string): string {
        return bcrypt.hashSync(input, 10);
    }

    static getKeyObjectId(committeeId: number, keyId: number): string {
        return committeeId + '_' + keyId;
    }
}
