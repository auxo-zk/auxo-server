import { Test, TestingModule } from '@nestjs/testing';
import { BuildersService } from './builders.service';

describe('BuildersService', () => {
    let service: BuildersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [BuildersService],
        }).compile();

        service = module.get<BuildersService>(BuildersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
