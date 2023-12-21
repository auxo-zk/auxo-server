import { Test, TestingModule } from '@nestjs/testing';
import { CommitteesService } from './committee.service';

describe('CommitteesService', () => {
    let service: CommitteesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CommitteesService],
        }).compile();

        service = module.get<CommitteesService>(CommitteesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
