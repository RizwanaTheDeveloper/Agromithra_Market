import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { BadRequestException, Body, Controller, Get, Headers, Module, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';

export const mediaMetadata = {id:true,listingId:true,kind:true,name:true,mime:true,position:true} as const;
class MediaOrderDto { @IsArray() @ArrayMaxSize(7) @ArrayUnique() @IsUUID('4',{each:true}) ids!: string[]; }
interface Upload { buffer:Buffer; mimetype:string; originalname:string; }
/** Folder for uploaded files. Set UPLOAD_DIR to an absolute path to keep them elsewhere (default: backend/uploads). */
const uploadRoot = () => resolve(process.env.UPLOAD_DIR || 'uploads');
/** Only paths inside the upload folder are ever read or deleted, whatever the database says. */
const inside = (relative: string) => { const full = resolve(uploadRoot(), relative); return full.startsWith(uploadRoot() + sep) ? full : null; };
const extension: Record<string,string> = {'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','video/mp4':'.mp4','video/quicktime':'.mov','video/3gpp':'.3gp','video/webm':'.webm'};
const removeFile = async (relative?: string | null) => { const full = relative ? inside(relative) : null; if (full) await rm(full, {force:true}); };
interface Download { setHeader(name:string,value:string | number):void; status(code:number):Download; end(data?:Buffer):void; }

@Controller()
export class MediaController {
  constructor(private readonly db: PrismaService) {}
  @Post('listings/:id/media') @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:30*1024*1024,files:1}}))
  async upload(@CurrentUser() user: User, @Param('id',ParseUUIDPipe) listingId:string,
    @Query('clientKey') clientKey:string, @UploadedFile() file:Upload) {
    if (!file || !/^[a-z0-9-]{1,100}$/i.test(clientKey || '')) throw new BadRequestException('Choose a file and valid upload key');
    const data=file.buffer, mime=file.mimetype;
    const photo = (mime==='image/jpeg' && data[0]===255 && data[1]===216 && data[2]===255) ||
      (mime==='image/png' && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
      (mime==='image/webp' && data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP');
    const video = (['video/mp4','video/quicktime','video/3gpp'].includes(mime) && data.toString('ascii',4,8)==='ftyp') ||
      (mime==='video/webm' && data.subarray(0,4).equals(Buffer.from([26,69,223,163])));
    if ((!photo && !video) || !data.length || (photo && data.length>15*1024*1024)) throw new BadRequestException('Unsupported or oversized photo/video');
    const kind=photo?'photo':'video';
    const relative = join(listingId, randomUUID() + (extension[mime] ?? extname(file.originalname).slice(0,8)));
    let replaced: string | null | undefined;
    try {
    const saved = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id=${listingId}::uuid FOR UPDATE`;
      if (!await tx.listing.findFirst({where:{id:listingId,sellerId:user.id}})) throw new NotFoundException();
      const existing=await tx.listingMedia.findUnique({where:{listingId_clientKey:{listingId,clientKey}}});
      const count=await tx.listingMedia.count({where:{listingId,kind,...(existing?{id:{not:existing.id}}:{})}});
      if (count >= (photo?6:1)) throw new BadRequestException('Maximum six photos and one video per listing');
      replaced = existing?.path;
      const target = inside(relative) as string;
      await mkdir(dirname(target), {recursive:true});
      await writeFile(target, data);
      return tx.listingMedia.upsert({where:{listingId_clientKey:{listingId,clientKey}},
        create:{listingId,clientKey,kind,name:file.originalname.slice(0,100),mime,path:relative,position:count},
        update:{kind,mime,path:relative,data:null,name:file.originalname.slice(0,100)},select:mediaMetadata});
    });
    await removeFile(replaced);
    return saved;
    } catch (e) { await removeFile(relative); throw e; }
  }
  @Patch('listings/:id/media') @UseGuards(AuthGuard)
  async order(@CurrentUser() user:User,@Param('id',ParseUUIDPipe) listingId:string,@Body() body:MediaOrderDto) {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id=${listingId}::uuid FOR UPDATE`;
      if (!await tx.listing.findFirst({where:{id:listingId,sellerId:user.id}})) throw new NotFoundException();
      if (await tx.listingMedia.count({where:{listingId,id:{in:body.ids}}})!==body.ids.length) throw new BadRequestException('Media does not belong to this listing');
      const gone = await tx.listingMedia.findMany({where:{listingId,id:{notIn:body.ids}},select:{path:true}});
      await tx.listingMedia.deleteMany({where:{listingId,id:{notIn:body.ids}}});
      for (const item of gone) await removeFile(item.path);
      for (const [position,id] of body.ids.entries()) await tx.listingMedia.update({where:{id},data:{position}});
      return {saved:true};
    });
  }
  private async download(id:string,res:Download,range:string|undefined,sellerId?:string,listingId?:string) {
    const item=await this.db.listingMedia.findFirst({where:{id,...(listingId?{listingId}:{}),listing:sellerId?{sellerId}:{status:'active',expiresAt:{gt:new Date()}}}});
    if (!item) throw new NotFoundException();
    // Files on disk are the norm; rows from before the move may still hold their bytes.
    const full = item.path ? inside(item.path) : null;
    if (item.path && !full) throw new NotFoundException();
    const data = full ? await readFile(full).catch(() => { throw new NotFoundException(); }) : Buffer.from(item.data ?? []);
    res.setHeader('Content-Type',item.mime); res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control',sellerId?'private, no-store':'public, max-age=60'); res.setHeader('Accept-Ranges','bytes');
    if (range) {
      const match=/^bytes=(\d+)-(\d*)$/.exec(range);
      const start=match?Number(match[1]):-1,end=match&&match[2]?Math.min(Number(match[2]),data.length-1):data.length-1;
      if (start<0 || start>=data.length || end<start) {res.setHeader('Content-Range',`bytes */${data.length}`);res.status(416).end();return;}
      res.status(206);res.setHeader('Content-Range',`bytes ${start}-${end}/${data.length}`);res.setHeader('Content-Length',end-start+1);res.end(data.subarray(start,end+1));
    } else {res.setHeader('Content-Length',data.length);res.end(data);}
  }
  @Get('media/:id') publicMedia(@Param('id',ParseUUIDPipe) id:string,@Res() res:Download,@Headers('range') range?:string) {return this.download(id,res,range);}
  @Get('listings/:listingId/media/:id') @UseGuards(AuthGuard)
  ownMedia(@CurrentUser() user:User,@Param('listingId',ParseUUIDPipe) listingId:string,@Param('id',ParseUUIDPipe) id:string,@Res() res:Download,@Headers('range') range?:string) {return this.download(id,res,range,user.id,listingId);}
}
@Module({controllers:[MediaController]})
export class MediaModule {}
