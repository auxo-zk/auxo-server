import { Test, TestingModule } from '@nestjs/testing';
import { OrganizersService } from './organizers.service';

describe('OrganizersService', () => {
    let service: OrganizersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OrganizersService],
        }).compile();

        service = module.get<OrganizersService>(OrganizersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
