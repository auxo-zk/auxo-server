import { Injectable, Logger } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import {
    Field,
    Group,
    Mina,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
} from 'o1js';
import { Model } from 'mongoose';
import {
    DkgAction,
    getDkgActionData,
} from 'src/schemas/actions/dkg-action.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
    Round1Action,
    getRound1ActionData,
} from 'src/schemas/actions/round-1-action.schema';
import {
    getRound2ActionData,
    Round2Action,
} from 'src/schemas/actions/round-2-action.schema';
import { Dkg } from 'src/schemas/dkg.schema';
import { Round1 } from 'src/schemas/round-1.schema';
import { Round2 } from 'src/schemas/round-2.schema';
import { Key } from 'src/schemas/key.schema';
import {
    calculatePublicKey,
    Constants,
    Libs,
    Round1Contribution,
    Storage,
    ZkApp,
} from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { Bit255 } from '@auxo-dev/auxo-libs';
import { Committee } from 'src/schemas/committee.schema';
import {
    ActionReduceStatusEnum,
    DkgActionEnum,
    KeyStatusEnum,
    MaxRetries,
    ZkAppEnum,
    zkAppCache,
} from 'src/constants';
import { Action } from 'src/interfaces/action.interface';
import { ContractServiceInterface } from 'src/interfaces/contract-service.interface';
import {
    DkgState,
    Round1State,
    Round2State,
} from 'src/interfaces/zkapp-state.interface';
import { CommitteeContractService } from '../committee-contract/committee-contract.service';
import * as _ from 'lodash';

@Injectable()
export class DkgContractsService implements ContractServiceInterface {
    private readonly logger = new Logger(DkgContractsService.name);
    private _dkg: {
        zkApp: Storage.AddressStorage.AddressStorage;
        keyCounter: Storage.CommitteeStorage.KeyCounterStorage;
        keyStatus: Storage.DKGStorage.KeyStatusStorage;
        key: Storage.DKGStorage.KeyStorage;
        processRoot: string;
    };
    private _round1: {
        zkApp: Storage.AddressStorage.AddressStorage;
        contribution: Storage.DKGStorage.Round1ContributionStorage;
        publicKey: Storage.DKGStorage.PublicKeyStorage;
        processRoot: string;
    };
    private _round2: {
        zkApp: Storage.AddressStorage.AddressStorage;
        contribution: Storage.DKGStorage.Round2ContributionStorage;
        encryption: Storage.DKGStorage.EncryptionStorage;
        processRoot: string;
    };

    public get dkg(): {
        zkApp: Storage.AddressStorage.AddressStorage;
        keyCounter: Storage.CommitteeStorage.KeyCounterStorage;
        keyStatus: Storage.DKGStorage.KeyStatusStorage;
        key: Storage.DKGStorage.KeyStorage;
        processRoot: string;
    } {
        return this._dkg;
    }

    public get round1(): {
        zkApp: Storage.AddressStorage.AddressStorage;
        contribution: Storage.DKGStorage.Round1ContributionStorage;
        publicKey: Storage.DKGStorage.PublicKeyStorage;
        processRoot: string;
    } {
        return this._round1;
    }

    public get round2(): {
        zkApp: Storage.AddressStorage.AddressStorage;
        contribution: Storage.DKGStorage.Round2ContributionStorage;
        encryption: Storage.DKGStorage.EncryptionStorage;
        processRoot: string;
    } {
        return this._round2;
    }

    constructor(
        private readonly queryService: QueryService,
        private readonly committeeContractService: CommitteeContractService,
        @InjectModel(DkgAction.name)
        private readonly dkgActionModel: Model<DkgAction>,
        @InjectModel(Dkg.name)
        private readonly dkgModel: Model<Dkg>,
        @InjectModel(Round1Action.name)
        private readonly round1ActionModel: Model<Round1Action>,
        @InjectModel(Round1.name)
        private readonly round1Model: Model<Round1>,
        @InjectModel(Round2Action.name)
        private readonly round2ActionModel: Model<Round2Action>,
        @InjectModel(Round2.name)
        private readonly round2Model: Model<Round2>,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
    ) {
        this._dkg = {
            zkApp: new Storage.AddressStorage.AddressStorage(),
            keyCounter: new Storage.CommitteeStorage.KeyCounterStorage(),
            keyStatus: new Storage.DKGStorage.KeyStatusStorage(),
            key: new Storage.DKGStorage.KeyStorage(),
            processRoot: '',
        };
        this._round1 = {
            zkApp: new Storage.AddressStorage.AddressStorage(),
            contribution: new Storage.DKGStorage.Round1ContributionStorage(),
            publicKey: new Storage.DKGStorage.PublicKeyStorage(),
            processRoot: '',
        };
        this._round2 = {
            zkApp: new Storage.AddressStorage.AddressStorage(),
            contribution: new Storage.DKGStorage.Round2ContributionStorage(),
            encryption: new Storage.DKGStorage.EncryptionStorage(),
            processRoot: '',
        };
    }

    async onModuleInit() {
        try {
            await this.fetch();
            await this.updateMerkleTrees();
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
                await this.fetchDkgActions();
                await this.fetchRound1Actions();
                await this.fetchRound2Actions();
                await this.updateKeys();
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async compile() {
        const cache = zkAppCache;
    }

    async fetchDkgState(): Promise<DkgState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.DKG_ADDRESS,
        );
        const result: DkgState = {
            zkAppRoot: Field(state[0]),
            keyCounterRoot: Field(state[1]),
            keyStatusRoot: Field(state[2]),
            keyRoot: Field(state[3]),
            processRoot: Field(state[4]),
        };
        this._dkg.processRoot = result.processRoot.toString();
        return result;
    }

    async fetchRound1State(): Promise<Round1State> {
        const state = await this.queryService.fetchZkAppState(
            process.env.ROUND_1_ADDRESS,
        );
        const result: Round1State = {
            zkAppRoot: Field(state[0]),
            contributionRoot: Field(state[1]),
            publicKeyRoot: Field(state[2]),
            processRoot: Field(state[3]),
        };
        this._round1.processRoot = result.processRoot.toString();
        return result;
    }

    async fetchRound2State(): Promise<Round2State> {
        const state = await this.queryService.fetchZkAppState(
            process.env.ROUND_2_ADDRESS,
        );
        const result: Round2State = {
            zkAppRoot: Field(state[0]),
            contributionRoot: Field(state[1]),
            encryptionRoot: Field(state[2]),
            processRoot: Field(state[3]),
        };
        this._round2.processRoot = result.processRoot.toString();
        return result;
    }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchDkgActions() {
        const lastAction = await this.dkgActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.DKG_ADDRESS,
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
            const actionData = getDkgActionData(action.actions[0]);
            await this.dkgActionModel.findOneAndUpdate(
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

    private async fetchRound1Actions() {
        const lastAction = await this.round1ActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );
        let actions: Action[] = await this.queryService.fetchActions(
            process.env.ROUND_1_ADDRESS,
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
            const actionData = getRound1ActionData(action.actions[0]);
            await this.round1ActionModel.findOneAndUpdate(
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

    private async fetchRound2Actions() {
        const lastAction = await this.round2ActionModel.findOne(
            {},
            {},
            { sort: { actionId: -1 } },
        );

        let actions: Action[] = await this.queryService.fetchActions(
            process.env.ROUND_2_ADDRESS,
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
            const actionData = getRound2ActionData(action.actions[0]);
            await this.round2ActionModel.findOneAndUpdate(
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

    private async updateKeys() {
        const keyCounters: { _id: number; count: number }[] =
            await this.dkgModel.aggregate([
                {
                    $match: {
                        active: true,
                        actionEnum: DkgActionEnum.GENERATE_KEY,
                    },
                },
                {
                    $group: {
                        _id: '$committeeId',
                        count: { $count: {} },
                    },
                },
            ]);
        for (let i = 0; i < keyCounters.length; i++) {
            const keyCounter = keyCounters[i];
            const committeeId = keyCounter._id;
            await this.dkgModel.find(
                { active: true },
                {},
                { sort: { actionId: 1 } },
            );
            for (let keyId = 0; keyId < keyCounter.count; keyId++) {
                const keyObjectId = Utilities.getKeyObjectId(
                    committeeId,
                    keyId,
                );
                const existed = await this.keyModel.exists({
                    _id: keyObjectId,
                });
                if (!existed) {
                    await this.keyModel.create({
                        _id: keyObjectId,
                        committeeId: committeeId,
                        keyId: keyId,
                        status: KeyStatusEnum.ROUND_1_CONTRIBUTION,
                    });
                }
                const deprecated = await this.dkgModel.exists({
                    committeeId: committeeId,
                    keyId: keyId,
                    actionEnum: DkgActionEnum.DEPRECATE_KEY,
                    active: true,
                });
                const key = await this.keyModel.findOne({
                    _id: keyObjectId,
                });
                if (deprecated) {
                    key.set('status', KeyStatusEnum.DEPRECATED);
                } else {
                    const finalizedRound2 = await this.dkgModel.exists({
                        committeeId: committeeId,
                        keyId: keyId,
                        actionEnum: DkgActionEnum.FINALIZE_ROUND_2,
                        active: true,
                    });
                    if (finalizedRound2) {
                        key.set('status', KeyStatusEnum.ACTIVE);
                    } else {
                        const finalizedRound1 = await this.dkgModel.exists({
                            committeeId: committeeId,
                            keyId: keyId,
                            actionEnum: DkgActionEnum.FINALIZE_ROUND_1,
                            active: true,
                        });
                        if (finalizedRound1) {
                            key.set(
                                'status',
                                KeyStatusEnum.ROUND_2_CONTRIBUTION,
                            );
                        }
                    }
                    if (
                        key.status >= KeyStatusEnum.ROUND_2_CONTRIBUTION &&
                        !key.publicKey
                    ) {
                        const round1s = await this.round1Model.find({
                            committeeId: committeeId,
                            keyId: keyId,
                            active: true,
                        });

                        const round1Contributions = round1s.map(
                            (e) =>
                                new Round1Contribution({
                                    C: new Libs.Committee.CArray(
                                        e.contribution.map((g) =>
                                            Group.from(g.x, g.y),
                                        ),
                                    ),
                                }),
                        );

                        const publicKey = PublicKey.fromGroup(
                            calculatePublicKey(round1Contributions),
                        );
                        key.set('publicKey', publicKey.toBase58());
                    }
                }
                await key.save();
            }
        }
    }

    async updateMerkleTrees() {
        try {
            await this.updateMerkleTreesForDkg();
            await this.updateMerkleTreesForRound1();
            await this.updateMerkleTreesForRound2();
        } catch (err) {}
    }

    private async updateMerkleTreesForDkg() {}

    private async updateMerkleTreesForRound1() {}

    private async updateMerkleTreesForRound2() {}
}
