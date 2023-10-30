import { Test, TestingModule } from '@nestjs/testing';
import { Network } from './network';

describe('Network', () => {
    let provider: Network;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [Network],
        }).compile();

        provider = module.get<Network>(Network);
    });

    it('should be defined', () => {
        expect(provider).toBeDefined();
    });
});
