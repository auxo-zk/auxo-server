import {
    Injectable,
    OnModuleInit,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { AppService } from 'src/app.service';
import { QueryService } from '../query/query.service';
import {
    Encoding,
    Field,
    MerkleMap,
    MerkleTree,
    Mina,
    Poseidon,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
} from 'o1js';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, set } from 'mongoose';
import {
    CommitteeAction,
    getCommitteeActionData,
} from 'src/schemas/actions/committee-action.schema';
import { Storage, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { Ipfs } from 'src/ipfs/ipfs';
import { MaxRetries, zkAppCache } from 'src/constants';
import { Action } from 'src/interfaces/action.interface';
import { CommitteeState } from 'src/interfaces/zkapp-state.interface';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import { error } from 'console';
import * as _ from 'lodash';
import { Constants } from '@auxo-dev/platform';

@Injectable()
export class CommitteeContractService implements ContractServiceInterface {
    private readonly logger = new Logger(CommitteeContractService.name);
    private _nextCommitteeId: number;
    private _member: Storage.CommitteeStorage.MemberStorage;
    private _setting: Storage.CommitteeStorage.SettingStorage;
    private _zkApp: Storage.AddressStorage.AddressStorage;
    private _actionState: string;

    public get member(): Storage.CommitteeStorage.MemberStorage {
        return this._member;
    }

    public get setting(): Storage.CommitteeStorage.SettingStorage {
        return this._setting;
    }

    public get zkApp(): Storage.AddressStorage.AddressStorage {
        return this._zkApp;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(CommitteeAction.name)
        private readonly committeeActionModel: Model<CommitteeAction>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {
        this._nextCommitteeId = 0;
        this._actionState = '';
        this._member = new Storage.CommitteeStorage.MemberStorage();
        this._setting = new Storage.CommitteeStorage.SettingStorage();
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

    async update() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
        } catch (err) {}
    }

    async fetch() {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await this.fetchCommitteeActions();
                await this.updateCommittees();
                count = MaxRetries;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
    }

    async fetchCommitteeState(): Promise<CommitteeState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.COMMITTEE_ADDRESS,
        );
        const result: CommitteeState = {
            nextCommitteeId: Field(state[0]),
            memberRoot: Field(state[1]),
            settingRoot: Field(state[2]),
            zkAppRoot: Field(state[3]),
            actionState: Field(state[4]),
        };
        this._nextCommitteeId = Number(result.nextCommitteeId.toBigInt());
        this._actionState = result.actionState.toString();
        return result;
    }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchCommitteeActions(): Promise<void> {
        const lastAction = await this.committeeActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.COMMITTEE_ADDRESS,
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
            const actionData = getCommitteeActionData(action.actions[0]);
            await this.committeeActionModel.findOneAndUpdate(
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

    private async updateCommittees() {
        this.fetchCommitteeState();
        const currentAction = await this.committeeActionModel.findOne({
            currentActionState: this._actionState,
        });
        if (currentAction != undefined) {
            const notActiveActions = await this.committeeActionModel.find(
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
                const ipfsData = await this.ipfs.getData(
                    notActiveAction.actionData.ipfsHash,
                );
                await Promise.all([
                    notActiveAction.save(),
                    this.committeeModel.findOneAndUpdate(
                        {
                            committeeId: this._nextCommitteeId,
                        },
                        {
                            committeeId: this._nextCommitteeId,
                            threshold: notActiveAction.actionData.threshold,
                            numberOfMembers:
                                notActiveAction.actionData.addresses.length,
                            publicKeys: notActiveAction.actionData.addresses,
                            ipfsData: ipfsData,
                        },
                        { new: true, upsert: true },
                    ),
                ]);
                this._nextCommitteeId += 1;
            }
        }
    }

    async updateMerkleTrees() {
        try {
            const committees = await this.committeeModel.find();
            for (let i = 0; i < committees.length; i++) {
                const committee = committees[i];
                const level1Index = this._member.calculateLevel1Index(
                    Field(committee.committeeId),
                );
                this._member.updateInternal(
                    level1Index,
                    Storage.CommitteeStorage.COMMITTEE_LEVEL_2_TREE(),
                );
                const settingLeaf = this._setting.calculateLeaf({
                    T: Field(committee.threshold),
                    N: Field(committee.numberOfMembers),
                });
                this._setting.updateLeaf(
                    { level1Index: level1Index },
                    settingLeaf,
                );
                for (let j = 0; j < committee.publicKeys.length; j++) {
                    const level2Index = this._member.calculateLevel2Index(
                        Field(j),
                    );
                    const memberLeaf = this._member.calculateLeaf(
                        PublicKey.fromBase58(committee.publicKeys[j]),
                    );
                    this._member.updateLeaf(
                        {
                            level1Index: level1Index,
                            level2Index: level2Index,
                        },
                        memberLeaf,
                    );
                }
            }
        } catch (err) {}
    }
}
