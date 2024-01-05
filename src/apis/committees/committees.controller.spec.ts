import { Test, TestingModule } from '@nestjs/testing';
import { CommitteesController } from './committees.controller';

describe('CommitteesController', () => {
    let controller: CommitteesController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CommitteesController],
        }).compile();

        controller = module.get<CommitteesController>(CommitteesController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
