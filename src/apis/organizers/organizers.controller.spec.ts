import { Test, TestingModule } from '@nestjs/testing';
import { OrganizersController } from './organizers.controller';

describe('OrganizersController', () => {
    let controller: OrganizersController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrganizersController],
        }).compile();

        controller = module.get<OrganizersController>(OrganizersController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
