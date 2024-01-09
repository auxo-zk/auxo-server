import { Test, TestingModule } from '@nestjs/testing';
import { BuildersController } from './builders.controller';

describe('BuildersController', () => {
    let controller: BuildersController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BuildersController],
        }).compile();

        controller = module.get<BuildersController>(BuildersController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
