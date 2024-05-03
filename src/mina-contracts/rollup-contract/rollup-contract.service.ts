import { Injectable, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Ipfs } from 'src/ipfs/ipfs';
import { Storage } from '@auxo-dev/dkg';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { InjectModel } from '@nestjs/mongoose';
import {
    getRollupActionData,
    RollupAction,
} from 'src/schemas/actions/rollup-action.schema';
import { Model } from 'mongoose';
import { RollupState } from 'src/interfaces/zkapp-state.interface';
import { Field, Reducer } from 'o1js';
import { Action } from 'src/interfaces/action.interface';
import { MaxRetries } from 'src/constants';

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
        this._zkAppStorage = new Storage.AddressStorage.AddressStorage();
    }

    async fetch() {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await this.fetchRollupActions();
                await this.updateRollupActions();
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async updateMerkleTrees() {
        throw new Error('Method not implemented.');
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
        } catch (err) {}
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
            process.env.PROJECT_ADDRESS,
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
                const promises = [];
                const notActiveAction = notActiveActions[i];
                notActiveAction.set('active', true);
                promises.push(notActiveAction.save());
                await Promise.all(promises);
            }
        }
    }
}
