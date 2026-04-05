import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
