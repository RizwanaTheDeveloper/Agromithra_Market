import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Category } from '@prisma/client';

export class PageQuery {
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() offset = 0;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 20;
  @IsEnum(Category) @IsOptional() category?: Category;
  @IsString() @MaxLength(100) @IsOptional() city?: string;
  @IsString() @MaxLength(100) @IsOptional() search?: string;
}
