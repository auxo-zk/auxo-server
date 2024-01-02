import { Controller, Get } from '@nestjs/common';
import { StoragesService } from './storages.service';
import { CommitteesService } from '../committees/committees.service';

@Controller('storages')
export class StoragesController {
    constructor(
        private readonly storagesService: StoragesService,
        private readonly committeesService: CommitteesService,
    ) {}

    // @Get('committee/member')
    // async getMemberLevel1() {
    //     this.committeesService.memberTree;
    // }
}
