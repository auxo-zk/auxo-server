export class ServerConfig {
    publicKey: string;
    contracts: {
        committee: string;
        dkg: string;
        round1: string;
        round2: string;
        request: string;
        response: string;
    };
    cacheDir: string;
}
