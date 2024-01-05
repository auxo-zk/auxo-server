import { Test, TestingModule } from '@nestjs/testing';
import { CommitteeContractService } from './committee-contract.service';

describe('CommitteeContractService', () => {
    let service: CommitteeContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CommitteeContractService],
        }).compile();

        service = module.get<CommitteeContractService>(
            CommitteeContractService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
