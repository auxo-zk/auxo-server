import { Injectable, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Ipfs } from 'src/ipfs/ipfs';
import {
    FinalizeResponse,
    Rollup,
    RollupContract,
    Storage,
    ZkApp,
} from '@auxo-dev/dkg';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { InjectModel } from '@nestjs/mongoose';
import {
    getRollupActionData,
    RollupAction,
} from 'src/schemas/actions/rollup-action.schema';
import { Model } from 'mongoose';
import { RollupState } from 'src/interfaces/zkapp-state.interface';
import { Field, Mina, PrivateKey, Provable, PublicKey, Reducer } from 'o1js';
import { Action } from 'src/interfaces/action.interface';
import { MaxRetries, ZkAppCache, ZkAppIndex } from 'src/constants';
import { Network } from '../network/network';
import { Utilities } from '../utilities';
import * as _ from 'lodash';
import { Utils } from '@auxo-dev/auxo-libs';

@Injectable()
export class RollupContractService implements ContractServiceInterface {
    private readonly logger = new Logger(RollupContractService.name);
    private readonly _zkAppStorage: Storage.AddressStorage.AddressStorage;
    private readonly _counterStorage: Storage.RollupStorage.RollupCounterStorage;
    private readonly _rollupStorage: Storage.RollupStorage.RollupStorage;
    private _actionState: string;

    public get zkAppStorage(): Storage.AddressStorage.AddressStorage {
        return this._zkAppStorage;
    }

    public get counterStorage(): Storage.RollupStorage.RollupCounterStorage {
        return this._counterStorage;
    }

    public get rollupStorage(): Storage.RollupStorage.RollupStorage {
        return this._rollupStorage;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(RollupAction.name)
        private readonly rollupActionModel: Model<RollupAction>,
    ) {
        this._actionState = '';
        this._counterStorage = new Storage.RollupStorage.RollupCounterStorage();
        this._rollupStorage = new Storage.RollupStorage.RollupStorage();
        this._zkAppStorage = Utilities.getZkAppStorageForDkg();
    }

    async fetch() {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await this.fetchRollupActions();
                await this.updateRollupActions();
                count = MaxRetries;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async updateMerkleTrees() {
        try {
            await this.updateMerkleTreesForDkg();
            await this.updateMerkleTreesForRound1();
            await this.updateMerkleTreesForRound2();
            await this.updateMerkleTreesForResponse();
        } catch (err) {}
    }

    async update() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
        } catch (err) {}
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
            // await this.compile();
            // await this.rollup();
        } catch (err) {
            console.log(err);
        }
    }

    async compile() {
        const cache = ZkAppCache;
        await Rollup.compile({ cache });
        await RollupContract.compile({ cache });
    }

    async rollup() {
        try {
            const notActiveActions = await this.rollupActionModel.find(
                {
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            if (notActiveActions.length > 0) {
                const state = await this.fetchRollupState();
                let proof = await Rollup.init(
                    ZkApp.Rollup.RollupAction.empty(),
                    state.counterRoot,
                    state.rollupRoot,
                    state.actionState,
                );
                const counterStorage = _.cloneDeep(this._counterStorage);
                const rollupStorage = _.cloneDeep(this._rollupStorage);
                const actionCounter = {};
                const dkgActionCounter = await this.rollupActionModel.count({
                    active: true,
                    'actionData.zkAppIndex': ZkAppIndex.DKG,
                });
                actionCounter[ZkAppIndex.DKG] = dkgActionCounter;
                const round1ActionCounter = await this.rollupActionModel.count({
                    active: true,
                    'actionData.zkAppIndex': ZkAppIndex.ROUND1,
                });
                actionCounter[ZkAppIndex.ROUND1] = round1ActionCounter;
                const round2ActionCounter = await this.rollupActionModel.count({
                    active: true,
                    'actionData.zkAppIndex': ZkAppIndex.ROUND2,
                });
                actionCounter[ZkAppIndex.ROUND2] = round2ActionCounter;
                const responseActionCounter =
                    await this.rollupActionModel.count({
                        active: true,
                        'actionData.zkAppIndex': ZkAppIndex.RESPONSE,
                    });
                actionCounter[ZkAppIndex.RESPONSE] = responseActionCounter;
                for (let i = 0; i < notActiveActions.length; i++) {
                    const notActiveAction = notActiveActions[i];
                    proof = await Rollup.rollup(
                        ZkApp.Rollup.RollupAction.fromFields(
                            Utilities.stringArrayToFields(
                                notActiveAction.actions,
                            ),
                        ),
                        proof,
                        Field(
                            actionCounter[
                                notActiveAction.actionData.zkAppIndex
                            ],
                        ),
                        counterStorage.getWitness(
                            Field(notActiveAction.actionData.zkAppIndex),
                        ),
                        rollupStorage.getWitness(
                            rollupStorage.calculateLevel1Index({
                                zkAppIndex: Field(
                                    notActiveAction.actionData.zkAppIndex,
                                ),
                                actionId: Field(
                                    actionCounter[
                                        notActiveAction.actionData.zkAppIndex
                                    ],
                                ),
                            }),
                        ),
                    );
                    rollupStorage.updateRawLeaf(
                        {
                            level1Index: rollupStorage.calculateLevel1Index({
                                zkAppIndex: Field(
                                    notActiveAction.actionData.zkAppIndex,
                                ),
                                actionId: Field(
                                    actionCounter[
                                        notActiveAction.actionData.zkAppIndex
                                    ],
                                ),
                            }),
                        },
                        Field(notActiveAction.actionData.actionHash),
                    );
                    switch (notActiveAction.actionData.zkAppIndex) {
                        case ZkAppIndex.DKG:
                            actionCounter[ZkAppIndex.DKG] += 1;
                            counterStorage.updateRawLeaf(
                                {
                                    level1Index:
                                        counterStorage.calculateLevel1Index(
                                            Field(ZkAppIndex.DKG),
                                        ),
                                },
                                Field(dkgActionCounter),
                            );
                            break;
                        case ZkAppIndex.ROUND1:
                            actionCounter[ZkAppIndex.ROUND1] += 1;
                            counterStorage.updateRawLeaf(
                                {
                                    level1Index:
                                        counterStorage.calculateLevel1Index(
                                            Field(ZkAppIndex.ROUND1),
                                        ),
                                },
                                Field(round1ActionCounter),
                            );
                            break;
                        case ZkAppIndex.ROUND2:
                            actionCounter[ZkAppIndex.ROUND2] += 1;
                            counterStorage.updateRawLeaf(
                                {
                                    level1Index:
                                        counterStorage.calculateLevel1Index(
                                            Field(ZkAppIndex.ROUND2),
                                        ),
                                },
                                Field(round2ActionCounter),
                            );
                            break;
                        case ZkAppIndex.RESPONSE:
                            actionCounter[ZkAppIndex.RESPONSE] += 1;
                            counterStorage.updateRawLeaf(
                                {
                                    level1Index:
                                        counterStorage.calculateLevel1Index(
                                            Field(ZkAppIndex.RESPONSE),
                                        ),
                                },
                                Field(responseActionCounter),
                            );
                            break;
                    }
                }
                const rollupContract = new RollupContract(
                    PublicKey.fromBase58(process.env.ROLLUP_ADDRESS),
                );
                const feePayerPrivateKey = PrivateKey.fromBase58(
                    process.env.FEE_PAYER_PRIVATE_KEY,
                );
                await Utils.proveAndSendTx(
                    RollupContract.name,
                    'rollup',
                    async () => {
                        await rollupContract.rollup(proof);
                    },
                    {
                        sender: {
                            privateKey: feePayerPrivateKey,
                            publicKey: feePayerPrivateKey.toPublicKey(),
                        },
                        fee: process.env.FEE,
                        memo: '',
                        nonce: await this.queryService.fetchAccountNonce(
                            feePayerPrivateKey.toPublicKey().toBase58(),
                        ),
                    },
                    undefined,
                    undefined,
                    { info: true, error: true, memoryUsage: false },
                );
                return true;
            }
        } catch (err) {
            console.log(err);
        }
    }

    private async fetchRollupState(): Promise<RollupState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.ROLLUP_ADDRESS,
        );
        const result: RollupState = {
            zkAppRoot: Field(state[0]),
            counterRoot: Field(state[1]),
            rollupRoot: Field(state[2]),
            actionState: Field(state[3]),
        };
        this._actionState = result.actionState.toString();
        return result;
    }

    private async fetchRollupActions() {
        const lastAction = await this.rollupActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.ROLLUP_ADDRESS,
        );
        let previousActionState: Field;
        let actionId: number;
        if (!lastAction) {
            previousActionState = Reducer.initialActionState;
            actionId = 0;
        } else {
            actions = actions.slice(lastAction.actionId + 1);
            previousActionState = Field(lastAction.currentActionState);
            actionId = lastAction.actionId + 1;
        }
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const currentActionState = Field(action.hash);
            const actionData = getRollupActionData(action.actions[0]);
            await this.rollupActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
                },
                {
                    actionId: actionId,
                    actionHash: action.hash,
                    currentActionState: currentActionState.toString(),
                    previousActionState: previousActionState.toString(),
                    actions: action.actions[0],
                    actionData: actionData,
                },
                { new: true, upsert: true },
            );
            previousActionState = currentActionState;
            actionId += 1;
        }
    }

    private async updateRollupActions() {
        await this.fetchRollupState();
        const currentAction = await this.rollupActionModel.findOne({
            currentActionState: this._actionState,
        });

        if (currentAction != undefined) {
            const notActiveActions = await this.rollupActionModel.find(
                {
                    actionId: { $lte: currentAction.actionId },
                    active: false,
                },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < notActiveActions.length; i++) {
                const notActiveAction = notActiveActions[i];
                notActiveAction.set('active', true);
                await notActiveAction.save();
            }
        }
    }

    private async updateMerkleTreesForDkg() {
        const rollupActions = await this.rollupActionModel.find(
            {
                active: true,
                'actionData.zkAppIndex': ZkAppIndex.DKG,
            },
            {},
            { sort: { actionId: 1 } },
        );
        this._counterStorage.updateRawLeaf(
            {
                level1Index: this._counterStorage.calculateLevel1Index(
                    Field(ZkAppIndex.DKG),
                ),
            },
            Field(rollupActions.length),
        );

        for (let actionId = 0; actionId < rollupActions.length; actionId++) {
            const rollupAction = rollupActions[actionId];
            const level1Index = this._rollupStorage.calculateLevel1Index({
                zkAppIndex: Field(rollupAction.actionData.zkAppIndex),
                actionId: Field(actionId),
            });
            this._rollupStorage.updateRawLeaf(
                { level1Index },
                Field(rollupAction.actionData.actionHash),
            );
        }
    }

    private async updateMerkleTreesForRound1() {
        const rollupActions = await this.rollupActionModel.find(
            {
                active: true,
                'actionData.zkAppIndex': ZkAppIndex.ROUND1,
            },
            {},
            { sort: { actionId: 1 } },
        );
        this._counterStorage.updateRawLeaf(
            {
                level1Index: this._counterStorage.calculateLevel1Index(
                    Field(ZkAppIndex.ROUND1),
                ),
            },
            Field(rollupActions.length),
        );

        for (let actionId = 0; actionId < rollupActions.length; actionId++) {
            const rollupAction = rollupActions[actionId];
            const level1Index = this._rollupStorage.calculateLevel1Index({
                zkAppIndex: Field(rollupAction.actionData.zkAppIndex),
                actionId: Field(actionId),
            });
            this._rollupStorage.updateRawLeaf(
                { level1Index },
                Field(rollupAction.actionData.actionHash),
            );
        }
    }

    private async updateMerkleTreesForRound2() {
        const rollupActions = await this.rollupActionModel.find(
            {
                active: true,
                'actionData.zkAppIndex': ZkAppIndex.ROUND2,
            },
            {},
            { sort: { actionId: 1 } },
        );
        this._counterStorage.updateRawLeaf(
            {
                level1Index: this._counterStorage.calculateLevel1Index(
                    Field(ZkAppIndex.ROUND2),
                ),
            },
            Field(rollupActions.length),
        );

        for (let actionId = 0; actionId < rollupActions.length; actionId++) {
            const rollupAction = rollupActions[actionId];
            const level1Index = this._rollupStorage.calculateLevel1Index({
                zkAppIndex: Field(rollupAction.actionData.zkAppIndex),
                actionId: Field(actionId),
            });
            this._rollupStorage.updateRawLeaf(
                { level1Index },

                Field(rollupAction.actionData.actionHash),
            );
        }
    }

    private async updateMerkleTreesForResponse() {
        const rollupActions = await this.rollupActionModel.find(
            {
                active: true,
                'actionData.zkAppIndex': ZkAppIndex.RESPONSE,
            },
            {},
            { sort: { actionId: 1 } },
        );
        this._counterStorage.updateRawLeaf(
            {
                level1Index: this._counterStorage.calculateLevel1Index(
                    Field(ZkAppIndex.RESPONSE),
                ),
            },
            Field(rollupActions.length),
        );

        for (let actionId = 0; actionId < rollupActions.length; actionId++) {
            const rollupAction = rollupActions[actionId];
            const level1Index = this._rollupStorage.calculateLevel1Index({
                zkAppIndex: Field(rollupAction.actionData.zkAppIndex),
                actionId: Field(actionId),
            });
            this._rollupStorage.updateRawLeaf(
                { level1Index },
                Field(rollupAction.actionData.actionHash),
            );
        }
    }
}
