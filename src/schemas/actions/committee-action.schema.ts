import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Encoding, Field, PublicKey } from 'o1js';
import { Committee } from '../committee.schema';

export const memberTreeHeight = Number(
    process.env.MEMBER_TREE_HEIGHT as string,
);

export const enum CommitteeEventEnum {
    COMMITTEE_CREATED,
    __LENGTH,
}

@Schema({ versionKey: false })
export class CommitteeAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type CommitteeActionDocument = HydratedDocument<CommitteeAction>;
export const CommitteeActionSchema =
    SchemaFactory.createForClass(CommitteeAction);

export function getCommittee(committeeAction: CommitteeAction): Committee {
    const data = committeeAction.actions;
    const n = Number(Field.from(data[0]).toString());
    const publicKeys: string[] = [];
    for (let j = 0; j < n; j++) {
        const publicKey = PublicKey.fromFields([
            Field(data[1 + j * 2]),
            Field(data[1 + j * 2 + 1]),
        ]);
        publicKeys.push(publicKey.toBase58());
    }
    const t = Number(
        Field.from(data[1 + 2 ** (memberTreeHeight - 1) * 2]).toBigInt(),
    );
    const ipfsHashLength = Number(
        Field.from(data[1 + 2 ** (memberTreeHeight - 1) * 2 + 1]).toBigInt(),
    );
    const ipfsHashFields: Field[] = [];
    for (let j = 0; j < ipfsHashLength; j++) {
        ipfsHashFields.push(
            Field.from(data[1 + 2 ** (memberTreeHeight - 1) * 2 + 2 + j]),
        );
    }
    const ipfsHash = Encoding.stringFromFields(ipfsHashFields);

    const committeeIndex = committeeAction.actionId;
    const committee: Committee = {
        committeeIndex: committeeIndex,
        numberOfMembers: n,
        threshold: t,
        publicKeys: publicKeys,
        ipfsHash: ipfsHash,
    };
    return committee;
}
