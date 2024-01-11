import { Test, TestingModule } from '@nestjs/testing';
import { ParticipationContractService } from './participation-contract.service';

describe('ParticipationContractService', () => {
    let service: ParticipationContractService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ParticipationContractService],
        }).compile();

        service = module.get<ParticipationContractService>(
            ParticipationContractService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
