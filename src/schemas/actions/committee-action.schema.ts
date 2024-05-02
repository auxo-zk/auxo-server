import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Encoding, Field, Provable, PublicKey } from 'o1js';
import { Committee } from '../committee.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { IpfsHash } from '@auxo-dev/auxo-libs';

export class CommitteeActionData {
    addresses: string[];
    threshold: number;
    ipfsHash: string;

    constructor(addresses: string[], threshold: number, ipfsHash: string) {
        this.addresses = addresses;
        this.threshold = threshold;
        this.ipfsHash = ipfsHash;
    }

    static fromAction(
        action: ZkApp.Committee.CommitteeAction,
    ): CommitteeActionData {
        const addresses = [];
        for (let i = 0; i < action.addresses.length.toBigInt(); i++) {
            addresses.push(
                PublicKey.from(action.addresses.values[i]).toBase58(),
            );
        }
        return new CommitteeActionData(
            addresses,
            Number(action.threshold.toBigInt()),
            action.ipfsHash.toString(),
        );
    }
}
@Schema({ versionKey: false })
export class CommitteeAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ index: true })
    actionHash: string;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];

    @Prop({ type: CommitteeActionData })
    actionData: CommitteeActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type CommitteeActionDocument = HydratedDocument<CommitteeAction>;
export const CommitteeActionSchema =
    SchemaFactory.createForClass(CommitteeAction);

export function getCommitteeActionData(actions: string[]): CommitteeActionData {
    const action = ZkApp.Committee.CommitteeAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );
    return CommitteeActionData.fromAction(action);
}
