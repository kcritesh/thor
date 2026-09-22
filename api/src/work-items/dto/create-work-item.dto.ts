import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateWorkItemDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  externalId: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;
}
