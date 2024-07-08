import { Test, TestingModule } from '@nestjs/testing';
import { NullifierContractService } from './nullifier-contract.service';

describe('NullifierContractService', () => {
    let service: NullifierContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NullifierContractService],
        }).compile();

        service = module.get<NullifierContractService>(
            NullifierContractService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
