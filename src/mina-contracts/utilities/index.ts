import mongoose, { ObjectId } from 'mongoose';
import { AccountUpdate, Cache, Field, Mina, PrivateKey } from 'o1js';
import { Logger } from '@nestjs/common';
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

    static getKeyObjectId(committeeId: number, keyId: number): string {
        return committeeId + '_' + keyId;
    }

    static async compile(
        prg: any,
        cache?: Cache,
        logger?: Logger,
    ): Promise<void> {
        if (logger) logger.debug(`Compiling ${prg.name}...`);
        if (cache) await prg.compile({ cache });
        else await prg.compile();
        if (logger) logger.debug(`Compiled ${prg.name} successfully`);
    }

    static async proveAndSend(
        tx: Mina.Transaction,
        feePayer: PrivateKey,
        waitForSuccess = false,
        logger?: Logger,
    ) {
        let retries = 3; // Number of retries
        let res;
        while (retries > 0) {
            try {
                await tx.prove();
                res = await tx.sign([feePayer]).send();
                if (logger) logger.debug('Tx sent! Hash: ' + res.hash() || '');
                break; // Exit the loop if successful
            } catch (error) {
                if (logger) logger.error('Error: ' + error);
                retries--; // Decrement the number of retries
                if (retries === 0) {
                    if (logger) logger.debug('Tx can not be sent');
                    break;
                }
                if (logger)
                    logger.debug(`Retrying... (${retries} retries left)`);
            }
        }
        if (res && waitForSuccess) {
            try {
                if (logger) logger.debug('Waiting for tx to succeed...');
                await res.wait();
                if (logger) logger.debug('Tx succeeded!');
            } catch (error) {
                if (logger) logger.error('Error:', error);
            }
        }
    }
}
