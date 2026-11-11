import { Category, ListingStatus, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsISO8601, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';

export class ListingDetailDto {
  @IsString() @Length(1, 60) label!: string;
  @IsString() @Length(1, 120) value!: string;
}

export class CreateListingDto {
  @IsString() @Length(3, 120) title!: string;
  @IsString() @Length(10, 2000) description!: string;
  @IsEnum(Category) category!: Category;
  @IsString() @Length(2, 100) product!: string;
  @IsString() @Length(1, 100) variety!: string;
  @IsString() @Length(1, 80) grade!: string;
  @IsArray() @ArrayMaxSize(6) @ValidateNested({ each: true }) @Type(() => ListingDetailDto) @IsOptional() details?: ListingDetailDto[];
  @IsEnum(Unit) unit!: Unit;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1e10) price!: number;
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(1e10) quantity!: number;
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(1e10) minimumOrder!: number;
  @IsString() @Length(2, 100) city!: string;
  @IsString() @Length(2, 100) district!: string;
  @IsString() @Length(2, 100) state!: string;
  @IsISO8601() expiresAt!: string;
}
export class ListingStatusDto {
  @IsEnum(ListingStatus) status!: ListingStatus;
}
export class ContactSettingsDto {
  @IsBoolean() allowCall!: boolean;
  @IsBoolean() allowWhatsapp!: boolean;
}
export class ContactDto {
  @IsIn(['call', 'whatsapp']) channel!: 'call' | 'whatsapp';
}
