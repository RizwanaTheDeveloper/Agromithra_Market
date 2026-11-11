import { IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';

export class RequestOtpDto {
  @Matches(/^\+91[6-9]\d{9}$/) phone!: string;
}
export class VerifyOtpDto {
  @IsUUID() challengeId!: string;
  @Matches(/^\d{6}$/) code!: string;
}
export class ProfileDto {
  @IsString() @Length(2, 80) displayName!: string;
  @IsString() @Length(2, 100) city!: string;
  @IsIn(['en', 'te']) language!: string;
  @IsOptional() @IsString() @Length(2, 120) business?: string;
  @IsOptional() @IsIn(['buyer', 'seller']) role?: string;
}
export class VerificationDto {
  @IsString() @Length(2, 120) business!: string;
  @IsString() @Length(10, 500) purpose!: string;
}
export class ReviewDto {
  @IsIn(['approved', 'rejected']) status!: 'approved' | 'rejected';
  @IsString() @MaxLength(500) note!: string;
}
