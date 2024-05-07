import { Test, TestingModule } from '@nestjs/testing';
import { MethodInputsService } from './method-inputs.service';

describe('MethodInputsService', () => {
  let service: MethodInputsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MethodInputsService],
    }).compile();

    service = module.get<MethodInputsService>(MethodInputsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
