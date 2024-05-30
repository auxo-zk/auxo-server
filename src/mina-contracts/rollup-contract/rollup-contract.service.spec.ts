import { Test, TestingModule } from '@nestjs/testing';
import { RollupContractService } from './rollup-contract.service';

describe('RollupContractService', () => {
    let service: RollupContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RollupContractService],
        }).compile();

        service = module.get<RollupContractService>(RollupContractService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
