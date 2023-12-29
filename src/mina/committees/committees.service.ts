import {
    Injectable,
    OnModuleInit,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { QueryService } from '../query/query.service';
import {
    Encoding,
    Field,
    MerkleMap,
    MerkleTree,
    Mina,
    Poseidon,
    PrivateKey,
    PublicKey,
    Reducer,
} from 'o1js';
import { CommitteeState } from '../../interfaces/committee-state.interface';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, set } from 'mongoose';
import {
    CommitteeAction,
    getCommittee,
    memberTreeHeight,
} from 'src/schemas/actions/committee-action.schema';
import { Storage, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from '../utilities';
import { CommitteeStorage } from '@auxo-dev/dkg/build/esm/src/contracts/storages';
import { Ipfs } from 'src/ipfs/ipfs';
import { GetCommitteesDto } from 'src/dtos/get-committees.dto';
import { MemberRole } from 'src/constants';
import { CreateCommitteeDto } from 'src/dtos/create-committee.dto';
import { IpfsResponse } from 'src/interfaces/ipfs-response.interface';
import { Key } from 'src/schemas/key.schema';
import { Action } from 'src/interfaces/action.interface';
@Injectable()
export class CommitteesService implements OnModuleInit {
    private readonly logger = new Logger(CommitteesService.name);
    private nextCommitteeId: number;
    private committeeTree: MerkleTree;
    private settingTree: MerkleTree;
    private actionState: bigint;

    constructor(
        private readonly queryService: QueryService,
        private readonly ipfs: Ipfs,
        @InjectModel(CommitteeAction.name)
        private readonly committeeActionModel: Model<CommitteeAction>,
        @InjectModel(Committee.name)
        private readonly committeeModel: Model<Committee>,
        @InjectModel(Key.name)
        private readonly keyModel: Model<Key>,
    ) {
        this.nextCommitteeId = 0;
        this.committeeTree = new MerkleTree(
            Storage.CommitteeStorage.LEVEL1_TREE_HEIGHT,
        );
        this.settingTree = new MerkleTree(
            Storage.CommitteeStorage.LEVEL1_TREE_HEIGHT,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.fetch();
        const committees = await this.committeeModel.find({ active: true });
        this.insertLeaves(committees);
    }

    async update() {
        await this.fetch();
        const committees = await this.committeeModel.find(
            {
                committeeId: { $gte: this.nextCommitteeId },
                active: true,
            },
            {},
            { sort: { committeeId: 1 } },
        );
        this.insertLeaves(committees);
    }

    async fetch() {
        await this.fetchAllActions();
    }

    async compile() {
        ZkApp.Committee.CreateCommittee.compile().then(() => {
            this.logger.log('Compile CreateCommittee successfully');
            ZkApp.Committee.CommitteeContract.compile().then(() => {
                this.logger.log('Compile CommitteeContract successfully');
            });
        });
    }

    async fetchZkAppState(): Promise<CommitteeState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.COMMITTEE_ADDRESS,
        );
        const committeeState: CommitteeState = {
            nextCommitteeId: state[0],
            committeeTreeRoot: state[1],
            settingTreeRoot: state[2],
            actionState: state[3],
        };
        return committeeState;
    }

    async rollup() {
        const state = await this.fetchZkAppState();
        let proof = await ZkApp.Committee.CreateCommittee.firstStep(
            state.actionState,
            state.committeeTreeRoot,
            state.settingTreeRoot,
            state.nextCommitteeId,
        );
        const lastReducedAction = await this.committeeActionModel.findOne({
            currentActionState: state.actionState.toString(),
        });
        const notReducedActions = await this.committeeActionModel.find(
            {
                actionId: { $gt: lastReducedAction.actionId },
            },
            {},
            { sort: { actionId: 1 } },
        );
        const committeeTree = this.committeeTree;
        const settingTree = this.settingTree;
        let nextCommitteeId = this.nextCommitteeId;
        for (let i = 0; i < notReducedActions.length; i++) {
            const notReducedAction = notReducedActions[i];
            proof = await ZkApp.Committee.CreateCommittee.nextStep(
                proof,
                ZkApp.Committee.CommitteeAction.fromFields(
                    Utilities.stringArrayToFields(notReducedAction.actions),
                ),
                new Storage.CommitteeStorage.Level1Witness(
                    committeeTree.getWitness(BigInt(nextCommitteeId)),
                ),
                new Storage.CommitteeStorage.Level1Witness(
                    settingTree.getWitness(BigInt(nextCommitteeId)),
                ),
            );
            const committee = await this.committeeModel.findOne({
                committeeId: nextCommitteeId,
            });
            const memberTree = new MerkleTree(memberTreeHeight);
            for (let j = 0; j < committee.numberOfMembers; j++) {
                const publicKey = PublicKey.fromBase58(committee.publicKeys[j]);
                memberTree.setLeaf(
                    BigInt(j),
                    Poseidon.hash(publicKey.toFields()),
                );
            }
            committeeTree.setLeaf(
                BigInt(nextCommitteeId),
                memberTree.getRoot(),
            );
            settingTree.setLeaf(
                BigInt(nextCommitteeId),
                Poseidon.hash([
                    Field(committee.threshold),
                    Field(committee.numberOfMembers),
                ]),
            );
            nextCommitteeId += 1;
        }
        const committeeContract = new ZkApp.Committee.CommitteeContract(
            PublicKey.fromBase58(process.env.COMMITTEE_ADDRESS),
        );
        const feePayerPrivateKey = PrivateKey.fromBase58(
            process.env.FEE_PAYER_PRIVATE_KEY,
        );
        const tx = await Mina.transaction(
            {
                sender: feePayerPrivateKey.toPublicKey(),
                fee: '100000000',
            },
            () => {
                committeeContract.rollupIncrements(proof);
            },
        );
        await tx.prove();
        await tx.sign([feePayerPrivateKey]).send();
        await this.update();
    }

    // ============ PRIVATE FUNCTIONS ============

    private async fetchAllActions(): Promise<void> {
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
            await this.committeeActionModel.findOneAndUpdate(
                {
                    currentActionState: currentActionState.toString(),
                },
                {
                    actionId: actionId,
                    currentActionState: currentActionState.toString(),
                    previousActionState: previousActionState.toString(),
                    actions: action.actions[0],
                },
                { new: true, upsert: true },
            );
            previousActionState = currentActionState;
            actionId += 1;
        }
        await this.updateCommittees();
    }

    private async updateCommittees() {
        let promises = [];
        const lastCommittee = await this.committeeModel.findOne(
            {},
            {},
            { sort: { committeeId: -1 } },
        );

        let committeeActions: CommitteeAction[];
        if (lastCommittee != null) {
            committeeActions = await this.committeeActionModel.find(
                { actionId: { $gt: lastCommittee.committeeId } },
                {},
                { sort: { actionId: 1 } },
            );
        } else {
            committeeActions = await this.committeeActionModel.find(
                {},
                {},
                { sort: { actionId: 1 } },
            );
        }

        for (let i = 0; i < committeeActions.length; i++) {
            const committeeAction = committeeActions[i];
            const committeeId = committeeAction.actionId;
            const committee = getCommittee(committeeAction);
            const ipfsData = await this.ipfs.getData(committee.ipfsHash);
            committee.name = ipfsData['name'];
            committee.creator = ipfsData['creator'];
            committee.members = ipfsData['members'];
            promises.push(
                this.committeeModel.findOneAndUpdate(
                    { committeeId: committeeId },
                    committee,
                    { new: true, upsert: true },
                ),
            );
        }
        await Promise.all(promises);
        promises = [];
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
        );
        if (rawEvents.length > 0) {
            const lastEvent = rawEvents[rawEvents.length - 1].events;
            const lastActiveCommitteeId = Number(lastEvent[0].data[0]);
            const notActiveCommittees = await this.committeeModel.find(
                {
                    committeeId: { $lte: lastActiveCommitteeId },
                    active: false,
                },
                {},
                { sort: { committeeId: 1 } },
            );
            for (let i = 0; i < notActiveCommittees.length; i++) {
                const notActiveCommittee = notActiveCommittees[i];
                notActiveCommittee.set('active', true);
                promises.push(notActiveCommittee.save());
            }
            await Promise.all(promises);
        }
    }

    private insertLeaves(committees: Committee[]) {
        for (let i = 0; i < committees.length; i++) {
            const committee = committees[i];
            const memberTree = new MerkleTree(
                Storage.CommitteeStorage.LEVEL2_TREE_HEIGHT,
            );
            for (let j = 0; j < committee.numberOfMembers; j++) {
                const publicKey = PublicKey.fromBase58(committee.publicKeys[j]);
                memberTree.setLeaf(
                    BigInt(j),
                    Poseidon.hash(publicKey.toFields()),
                );
            }
            this.committeeTree.setLeaf(
                BigInt(this.nextCommitteeId),
                memberTree.getRoot(),
            );
            this.settingTree.setLeaf(
                BigInt(this.nextCommitteeId),
                Poseidon.hash([
                    Field(committee.threshold),
                    Field(committee.numberOfMembers),
                ]),
            );
            this.nextCommitteeId += 1;
        }
    }

    // Handle request

    async getAllCommittees(
        getCommitteesDto: GetCommitteesDto,
    ): Promise<Committee[]> {
        let committees: Committee[];
        if (
            getCommitteesDto.member != undefined &&
            getCommitteesDto.role != undefined
        ) {
            if (getCommitteesDto.role == MemberRole.OWNER) {
                committees = await this.committeeModel.aggregate([
                    { $match: { creator: getCommitteesDto.member } },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'requests',
                            localField: 'committeeId',
                            foreignField: 'committeeId',
                            pipeline: [
                                { $project: { requestId: 1, requester: 1 } },
                            ],
                        },
                    },
                ]);
            } else if (getCommitteesDto.role == MemberRole.MEMBER) {
                committees = await this.committeeModel.aggregate([
                    {
                        $match: {
                            creator: { $ne: getCommitteesDto.member },
                            publicKeys: getCommitteesDto.member,
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'requests',
                            localField: 'committeeId',
                            foreignField: 'committeeId',
                            pipeline: [
                                { $project: { requestId: 1, requester: 1 } },
                            ],
                        },
                    },
                ]);
            } else {
                committees = await this.committeeModel.aggregate([
                    {
                        $match: {
                            publicKeys: getCommitteesDto.member,
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'requests',
                            localField: 'committeeId',
                            foreignField: 'committeeId',
                            pipeline: [
                                { $project: { requestId: 1, requester: 1 } },
                            ],
                        },
                    },
                ]);
            }
        } else {
            committees = await this.committeeModel.aggregate([
                {
                    $match: {},
                },
                {
                    $lookup: {
                        from: 'dkgrequests',
                        as: 'requests',
                        localField: 'committeeId',
                        foreignField: 'committeeId',
                        pipeline: [
                            { $project: { requestId: 1, requester: 1 } },
                        ],
                    },
                },
            ]);
        }
        return committees;
    }

    async createCommittee(
        createCommitteeDto: CreateCommitteeDto,
    ): Promise<IpfsResponse> {
        const result = await this.ipfs.upload(createCommitteeDto);
        if (result == null) {
            throw new BadRequestException();
        }
        return result;
    }

    async getCommittee(committeeId: number): Promise<Committee> {
        const result = await this.committeeModel.aggregate([
            { $match: { committeeId: committeeId } },
            {
                $lookup: {
                    from: 'dkgrequests',
                    as: 'requests',
                    localField: 'committeeId',
                    foreignField: 'committeeId',
                    pipeline: [
                        {
                            $match: {
                                active: true,
                            },
                        },
                        { $project: { requestId: 1, requester: 1 } },
                    ],
                },
            },
        ]);

        if (result.length > 0) {
            return result[0];
        } else {
            return null;
        }
    }

    async getKeys(committeeId: number): Promise<Key[]> {
        const result = await this.keyModel.aggregate([
            { $match: { committeeId: committeeId } },
            {
                $lookup: {
                    from: 'round1',
                    as: 'round1s',
                    localField: 'keyId',
                    foreignField: 'keyId',
                    pipeline: [
                        { $match: { committeeId: committeeId, active: true } },
                        {
                            $project: {
                                memberId: 1,
                                contribution: 1,
                            },
                        },
                        {
                            $sort: {
                                memberId: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'round2',
                    as: 'round2s',
                    localField: 'keyId',
                    foreignField: 'keyId',
                    pipeline: [
                        { $match: { committeeId: committeeId, active: true } },
                        {
                            $project: {
                                memberId: 1,
                                contribution: 1,
                            },
                        },
                        {
                            $sort: {
                                memberId: 1,
                            },
                        },
                    ],
                },
            },
        ]);

        return result;
    }
}
