import { Injectable, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Ipfs } from 'src/ipfs/ipfs';
import { InjectModel } from '@nestjs/mongoose';
import {
    getRequesterActionData,
    RequesterAction,
} from 'src/schemas/actions/requester-action.schema';
import { Model } from 'mongoose';
import { Storage } from '@auxo-dev/dkg';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { RequesterState } from 'src/interfaces/zkapp-state.interface';
import { Field, Reducer } from 'o1js';
import { Action } from 'src/interfaces/action.interface';

@Injectable()
export class RequesterContractService implements ContractServiceInterface {
    private readonly logger = new Logger(RequesterContractService.name);
    private readonly zkApp: Storage.AddressStorage.AddressStorage;
    private counters: number;
    private readonly keyIndex: Storage.RequesterStorage.RequesterKeyIndexStorage;
    private readonly timestamp: Storage.RequesterStorage.TimestampStorage;
    private readonly accumulation: Storage.RequesterStorage.RequesterAccumulationStorage;
    private readonly commitment: Storage.RequesterStorage.CommitmentStorage;
    private lastTimestamp: number;
    private actionState: string;

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(RequesterAction.name)
        private readonly requesterActionModel: Model<RequesterAction>,
    ) {
        this.counters = 0;
        this.lastTimestamp = 0;
        this.actionState = '';

        this.zkApp = new Storage.AddressStorage.AddressStorage();
        this.keyIndex = new Storage.RequesterStorage.RequesterKeyIndexStorage();
        this.timestamp = new Storage.RequesterStorage.TimestampStorage();
        this.accumulation =
            new Storage.RequesterStorage.RequesterAccumulationStorage();
        this.commitment = new Storage.RequesterStorage.CommitmentStorage();
    }

    fetch() {
        throw new Error('Method not implemented.');
    }
    updateMerkleTrees() {
        throw new Error('Method not implemented.');
    }
    update() {
        throw new Error('Method not implemented.');
    }
    onModuleInit() {
        throw new Error('Method not implemented.');
    }

    private async fetchRequesterState(): Promise<RequesterState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.REQUESTER_ADDRESS,
        );
        const result: RequesterState = {
            zkAppRoot: Field(state[0]),
            counters: Field(state[1]),
            keyIndexRoot: Field(state[2]),
            timestampRoot: Field(state[3]),
            accumulationRoot: Field(state[4]),
            commitmentRoot: Field(state[5]),
            lastTimestamp: Field(state[6]),
            actionState: Field(state[7]),
        };
        this.counters = Number(result.counters.toBigInt());
        this.lastTimestamp = Number(result.lastTimestamp.toBigInt());
        this.actionState = result.actionState.toString();
        return result;
    }

    private async fetchRequesterActions() {
        const lastAction = await this.requesterActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.REQUESTER_ADDRESS,
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
            const actionData = getRequesterActionData(action.actions[0]);
            await this.requesterActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
                },
                {
                    actionId: actionId,
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

    private async updateRequesterActions() {
        await this.fetchRequesterState();
        const currentAction = await this.requesterActionModel.findOne({
            currentActionState: this.actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.requesterActionModel.find(
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
