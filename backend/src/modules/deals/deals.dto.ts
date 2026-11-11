import { Category, DealStage, Unit } from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateRequestDto {
  @IsString() @Length(3, 120) title!: string;
  @IsEnum(Category) category!: Category;
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(1e10) quantity!: number;
  @IsEnum(Unit) unit!: Unit;
  @IsString() @Length(2, 100) city!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1e10) @IsOptional() budget?: number;
  @IsString() @MaxLength(80) @IsOptional() purpose?: string;
  @IsString() @MaxLength(500) @IsOptional() note?: string;
  @IsISO8601() expiresAt!: string;
}
export class CreateDealDto {
  @IsUUID() listingId!: string;
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(1e10) quantity!: number;
  @IsUUID() idempotencyKey!: string;
}
export class StageDto {
  @IsEnum(DealStage) stage!: DealStage;
  @IsInt() @Min(1) version!: number;
}
