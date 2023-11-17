import { AccountUpdate, Field } from 'o1js';

export class Utilities {
    static stringArrayToFields(input: string[][]): Field[][] {
        const result: Field[][] = [];
        for (let i = 0; i < input.length; i++) {
            const row = input[i];
            const rowOutput: Field[] = [];
            for (let j = 0; j < row.length; j++) {
                rowOutput.push(Field.from(row[j]));
            }
            result.push(rowOutput);
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
}
