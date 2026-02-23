import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class CreateScanRequest {
  @ApiProperty({ example: 'https://github.com/owner/repo' })
  @IsNotEmpty()
  @Matches(/^https:\/\/github\.com\/[\w][\w.-]*\/[\w][\w.-]*(\.git)?$/, {
    message:
      'repositoryUrl must be a valid GitHub repository URL (https://github.com/owner/repo)',
  })
  repositoryUrl!: string;
}
