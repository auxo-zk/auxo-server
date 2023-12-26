import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ServerConfig } from './entities/server-config.entity';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    getServerConfig(): ServerConfig {
        return this.appService.getServerConfig();
    }
}
