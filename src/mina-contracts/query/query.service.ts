import { Injectable, Logger } from '@nestjs/common';
import {
    Field,
    Mina,
    PublicKey,
    UInt32,
    UInt64,
    fetchAccount,
    fetchEvents,
} from 'o1js';
import { Event } from '../../interfaces/event.interface';
import { Action } from 'src/interfaces/action.interface';
import { MaxRetries } from 'src/constants';

@Injectable()
export class QueryService {
    private readonly logger = new Logger(QueryService.name);
    constructor() {}

    async fetchEvents(
        publicKey: string,
        from?: number,
        to?: number,
    ): Promise<Event[]> {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                const events = await fetchEvents(
                    {
                        publicKey: publicKey,
                    },
                    undefined,
                    {
                        from: from == undefined ? undefined : UInt32.from(from),
                        to: to == undefined ? undefined : UInt32.from(to),
                    },
                );
                return events;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async fetchActions(
        publicKey: string,
        fromActionState?: Field,
        endActionState?: Field,
    ): Promise<Action[]> {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                return (await Mina.fetchActions(
                    PublicKey.fromBase58(publicKey),
                    {
                        fromActionState: fromActionState,
                        endActionState: endActionState,
                    },
                )) as Action[];
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async fetchAccountBalance(publicKey: string): Promise<UInt64> {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await fetchAccount({
                    publicKey: publicKey,
                });
                const account = Mina.getAccount(
                    PublicKey.fromBase58(publicKey),
                );
                return account.balance;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async fetchAccountNonce(publicKey: string): Promise<UInt32> {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                await fetchAccount({
                    publicKey: publicKey,
                });
                const account = Mina.getAccount(
                    PublicKey.fromBase58(publicKey),
                );
                return account.nonce;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async fetchZkAppState(publicKey: string): Promise<Field[]> {
        for (let count = 0; count < MaxRetries; count++) {
            try {
                const result = await fetchAccount({
                    publicKey: publicKey,
                });
                const account = result.account;
                return account.zkapp.appState;
            } catch (err) {
                this.logger.error(err);
            }
        }
    }
}
