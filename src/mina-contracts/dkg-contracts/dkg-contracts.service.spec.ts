import { Test, TestingModule } from '@nestjs/testing';
import { DkgContractsService } from './dkg-contracts.service';

describe('DkgContractsService', () => {
    let service: DkgContractsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DkgContractsService],
        }).compile();

        service = module.get<DkgContractsService>(DkgContractsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
