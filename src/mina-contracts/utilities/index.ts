import mongoose, { ObjectId } from 'mongoose';
import { AccountUpdate, Cache, Field, Mina, PrivateKey, PublicKey } from 'o1js';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import {
    calculateKeyIndex,
    Constants,
    Storage as DkgStorage,
    ZkApp,
} from '@auxo-dev/dkg';
import { Storage as PlatformStorage } from '@auxo-dev/platform';
import { ZkAppIndex } from 'src/constants';

export type Profiler = {
    times: Record<string, any>;
    start: (label: string) => void;
    stop: () => Profiler;
    store: () => void;
};

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

    static getKeyIndex(committeeId: number, keyId: number): number {
        return Number(
            calculateKeyIndex(Field(committeeId), Field(keyId)).toBigInt(),
        );
    }

    static async compile(
        prg: any,
        cache?: Cache,
        logger?: Logger,
        profiling = true,
    ): Promise<void> {
        try {
            if (logger) logger.debug(`Compiling ${prg.name}...`);
            if (cache) {
                if (profiling) {
                    const profiler = Utilities.getProfiler(prg.name);
                    profiler.start(prg.name + '.cache.compile');
                    await prg.compile({ cache });
                    profiler.stop().store();
                } else {
                    await prg.compile({ cache });
                }
            } else {
                if (profiling) {
                    const profiler = Utilities.getProfiler(prg.name);
                    profiler.start(prg.name + '.compile');
                    await prg.compile();
                    profiler.stop().store();
                } else {
                    await prg.compile();
                }
            }
            if (logger) logger.debug(`Compiled ${prg.name} successfully`);
        } catch (err) {
            throw err;
        }
    }

    static async proveAndSend(
        tx: Mina.Transaction,
        feePayer: PrivateKey,
        waitForSuccess = false,
        logger?: Logger,
    ) {
        try {
            let retries = 3; // Number of retries
            let res;
            while (retries > 0) {
                try {
                    await tx.prove();
                    res = await tx.sign([feePayer]).send();
                    if (logger)
                        logger.debug('Tx sent! Hash: ' + res.hash() || '');
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
        } catch (err) {
            throw err;
        }
    }

    static getProfiler(name: string): Profiler {
        const round = (x: number) => Math.round(x * 100) / 100;
        let times: Record<string, any> = {};
        let label: string;

        return {
            get times() {
                return times;
            },
            start(label_: string) {
                label = label_;
                times = {
                    ...times,
                    [label]: {
                        start: performance.now(),
                    },
                };
            },
            stop() {
                times[label].end = performance.now();
                return this;
            },
            store() {
                let profilingData = `## Times for ${name}\n\n`;
                profilingData += `| Name | time passed in s |\n|---|---|`;
                let totalTimePassed = 0;

                Object.keys(times).forEach((k) => {
                    const timePassed = (times[k].end - times[k].start) / 1000;
                    totalTimePassed += timePassed;

                    profilingData += `\n|${k}|${round(timePassed)}|`;
                });

                profilingData += `\n\nIn total, it took ${round(
                    totalTimePassed,
                )} seconds to run the entire benchmark\n\n\n`;

                fs.appendFileSync('profiling.md', profilingData);
            },
        };
    }

    static getZkAppStorageForDkg(): DkgStorage.AddressStorage.AddressStorage {
        const zkAppStorage = new DkgStorage.AddressStorage.AddressStorage();
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.ROLLUP),
            PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.COMMITTEE),
            PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.DKG),
            PublicKey.fromBase58(process.env.DKG_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.ROUND1),
            PublicKey.fromBase58(process.env.ROUND_1_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.ROUND2),
            PublicKey.fromBase58(process.env.ROUND_2_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.REQUEST),
            PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.RESPONSE),
            PublicKey.fromBase58(process.env.RESPONSE_ADDRESS),
        );
        return zkAppStorage;
    }

    static getZkAppStorageForRequester(
        taskManager: string,
        submission: string,
    ): DkgStorage.AddressStorage.AddressStorage {
        const zkAppStorage = new DkgStorage.AddressStorage.AddressStorage();
        zkAppStorage.updateAddress(
            Field(ZkApp.Requester.RequesterAddressBook.TASK_MANAGER),
            PublicKey.fromBase58(taskManager),
        );
        zkAppStorage.updateAddress(
            Field(ZkApp.Requester.RequesterAddressBook.SUBMISSION),
            PublicKey.fromBase58(submission),
        );
        zkAppStorage.updateAddress(
            Field(ZkApp.Requester.RequesterAddressBook.DKG),
            PublicKey.fromBase58(process.env.DKG_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkApp.Requester.RequesterAddressBook.REQUEST),
            PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
        );
        return zkAppStorage;
    }

    static getZkAppStorageForPlatform(): PlatformStorage.SharedStorage.ZkAppStorage {
        const zkAppStorage = new PlatformStorage.SharedStorage.ZkAppStorage();
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.DKG),
            PublicKey.fromBase58(process.env.DKG_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.REQUEST),
            PublicKey.fromBase58(process.env.REQUEST_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.PROJECT),
            PublicKey.fromBase58(process.env.PROJECT_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.CAMPAIGN),
            PublicKey.fromBase58(process.env.CAMPAIGN_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.PARTICIPATION),
            PublicKey.fromBase58(process.env.PARTICIPATION_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.FUNDING),
            PublicKey.fromBase58(process.env.FUNDING_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.TREASURY_MANAGER),
            PublicKey.fromBase58(process.env.TREASURY_MANAGER_ADDRESS),
        );
        zkAppStorage.updateAddress(
            Field(ZkAppIndex.FUNDING_REQUESTER),
            PublicKey.fromBase58(process.env.FUNDING_REQUESTER_ADDRESS),
        );

        return zkAppStorage;
    }
}
