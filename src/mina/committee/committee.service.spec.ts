import { Test, TestingModule } from '@nestjs/testing';
import { CommitteeService } from './committee.service';

describe('CommitteeService', () => {
    let service: CommitteeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CommitteeService],
        }).compile();

        service = module.get<CommitteeService>(CommitteeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
