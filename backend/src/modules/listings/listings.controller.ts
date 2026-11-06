import { Controller, Get } from '@nestjs/common';
@Controller('listings')
export class ListingsController {
 @Get() getAll(): {items:never[]} { return {items:[]}; }
}
