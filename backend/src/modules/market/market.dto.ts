import { Type } from 'class-transformer';
import { PriceBasis, Unit } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUrl, Length, Max, Min, ValidateNested } from 'class-validator';

// Browsing records may start without filters; estimates still require a fully
// specified product, variety, grade, unit, basis and location below.
export class ObservationQuery {
  @IsOptional() @IsString() @Length(2, 100) product?: string;
  @IsOptional() @IsString() @Length(1, 100) variety?: string;
  @IsOptional() @IsString() @Length(1, 80) grade?: string;
  @IsOptional() @IsEnum(Unit) unit?: Unit;
  @IsOptional() @IsEnum(PriceBasis) basis?: PriceBasis;
  @IsOptional() @IsString() @Length(2, 100) state?: string;
  @IsOptional() @IsString() @Length(2, 100) district?: string;
}

export class PriceQuery {
  @IsString() @Length(2, 100) product!: string;
  @IsString() @Length(1, 100) variety!: string;
  @IsString() @Length(1, 80) grade!: string;
  @IsEnum(Unit) unit!: Unit;
  @IsEnum(PriceBasis) basis!: PriceBasis;
  @IsString() @Length(2, 100) state!: string;
  @IsString() @Length(2, 100) district!: string;
}
export class ObservationDto extends PriceQuery {
  @IsString() @Length(2, 100) market!: string;
  @IsISO8601({ strict: true }) reportedAt!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1e10) minimum!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1e10) modal!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1e10) maximum!: number;
  @IsString() @Length(2, 150) sourceName!: string;
  @IsUrl({ protocols: ['https'], require_protocol: true }) sourceUrl!: string;
}
export class ImportPricesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ObservationDto)
  records!: ObservationDto[];
}
