import { Test, TestingModule } from '@nestjs/testing';
import { MinIoController } from './min-io.controller';

describe('MinIoController', () => {
    let controller: MinIoController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MinIoController],
        }).compile();

        controller = module.get<MinIoController>(MinIoController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
