import { Storage, ZkApp } from '@auxo-dev/platform';
import { Injectable, Logger } from '@nestjs/common';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { NullifierState } from 'src/interfaces/zkapp-state.interface';
import { QueryService } from '../query/query.service';
import { MaxRetries, ZkAppCache } from 'src/constants';
import { InjectModel } from '@nestjs/mongoose';
import {
    NullifierAction,
    getNullifierActionData,
} from 'src/schemas/actions/commitment-action.schema';
import { Model } from 'mongoose';
import { Action } from 'src/interfaces/action.interface';
import { Bool, Field, PrivateKey, PublicKey, Reducer } from 'o1js';
import { Utils } from '@auxo-dev/auxo-libs';
import * as _ from 'lodash';
import { Utilities } from '../utilities';

@Injectable()
export class NullifierContractService implements ContractServiceInterface {
    private readonly logger = new Logger(NullifierContractService.name);
    private readonly _nullifierStorage: Storage.NullifierStorage.NullifierStorage;
    private _actionState: string;
    constructor(
        private readonly queryService: QueryService,
        @InjectModel(NullifierAction.name)
        private readonly nullifierActionModel: Model<NullifierAction>,
    ) {
        this._nullifierStorage =
            new Storage.NullifierStorage.NullifierStorage();
        this._actionState = '';
    }

    async fetch() {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await this.fetchNullifierActions();
                await this.updateNullifierActions();
                count = MaxRetries;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const activeActions = await this.nullifierActionModel.find(
                { active: true },
                {},
                { sort: { actionId: 1 } },
            );
            for (let i = 0; i < activeActions.length; i++) {
                const activeAction = activeActions[i];
                this._nullifierStorage.updateRawLeaf(
                    Field(activeAction.actionData.nullifier),
                    Bool(true),
                );
            }
        } catch (err) {
            console.log(err);
        }
    }

    async update() {
        throw new Error('Method not implemented.');
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
        await ZkApp.Nullifier.RollupNullifier.compile({ cache });
        await ZkApp.Nullifier.NullifierContract.compile({ cache });
    }

    async fetchNullifierState(): Promise<NullifierState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.NULLIFIER_ADDRESS,
        );
        const result: NullifierState = {
            nullifierRoot: state[0],
            actionState: state[1],
        };
        this._actionState = result.actionState.toString();
        return result;
    }

    async rollup(): Promise<boolean> {
        try {
            const lastReducedAction = await this.nullifierActionModel.findOne(
                { active: true },
                {},
                {
                    sort: {
                        actionId: -1,
                    },
                },
            );
            const notReducedActions = await this.nullifierActionModel.find(
                {
                    actionId: {
                        $gt: lastReducedAction
                            ? lastReducedAction.actionId
                            : -1,
                    },
                },
                {},
                { sort: { actionId: 1 } },
            );
            if (notReducedActions.length > 0) {
                const state = await this.fetchNullifierState();
                let proof = await Utils.prove(
                    ZkApp.Nullifier.RollupNullifier.name,
                    'firstStep',
                    async () =>
                        ZkApp.Nullifier.RollupNullifier.firstStep(
                            state.nullifierRoot,
                            state.actionState,
                        ),
                    undefined,
                    { info: true, error: true },
                );
                const nullifierStorage = _.cloneDeep(this._nullifierStorage);
                for (let i = 0; i < notReducedActions.length; i++) {
                    const notReducedAction = notReducedActions[i];
                    proof = await Utils.prove(
                        ZkApp.Nullifier.RollupNullifier.name,
                        'firstStep',
                        async () =>
                            ZkApp.Nullifier.RollupNullifier.commit(
                                proof,
                                ZkApp.Nullifier.NullifierAction.fromFields(
                                    Utilities.stringArrayToFields(
                                        notReducedAction.actions,
                                    ),
                                ),
                                nullifierStorage.getLevel1Witness(
                                    Field(
                                        notReducedAction.actionData.nullifier,
                                    ),
                                ),
                            ),
                        undefined,
                        { info: true, error: true },
                    );
                    nullifierStorage.updateRawLeaf(
                        Field(notReducedAction.actionData.nullifier),
                        Bool(true),
                    );
                }
                const nullifierContract = new ZkApp.Nullifier.NullifierContract(
                    PublicKey.fromBase58(process.env.NULLIFIER_ADDRESS),
                );
                const feePayerPrivateKey = PrivateKey.fromBase58(
                    process.env.FEE_PAYER_PRIVATE_KEY,
                );
                await Utils.proveAndSendTx(
                    ZkApp.Nullifier.NullifierContract.name,
                    'rollup',
                    async () => nullifierContract.rollup(proof),
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
            return false;
        } catch (err) {
            console.log(err);
        }
    }

    // PRIVATE FUNCTIONS

    private async fetchNullifierActions() {
        const lastAction = await this.nullifierActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.NULLIFIER_ADDRESS,
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
            const actionData = getNullifierActionData(action.actions[0]);
            await this.nullifierActionModel.findOneAndUpdate(
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

    private async updateNullifierActions() {
        await this.fetchNullifierState();
        const currentAction = await this.nullifierActionModel.findOne({
            currentActionState: this._actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.nullifierActionModel.find(
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
}
