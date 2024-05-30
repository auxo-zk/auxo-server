import { Test, TestingModule } from '@nestjs/testing';
import { MethodInputsController } from './method-inputs.controller';

describe('MethodInputsController', () => {
  let controller: MethodInputsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MethodInputsController],
    }).compile();

    controller = module.get<MethodInputsController>(MethodInputsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
