import { Test, TestingModule } from '@nestjs/testing';
import { DkgService } from './dkg.service';

describe('DkgService', () => {
  let service: DkgService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DkgService],
    }).compile();

    service = module.get<DkgService>(DkgService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
