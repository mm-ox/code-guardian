import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ScanService } from '../application/scan.service';
import { CreateScanRequest } from './dto/create-scan.request';
import { ScanResponse } from './dto/scan.response';
import { ScanStatus } from '../application/scan.model';

@ApiTags('Scan')
@Controller('api/scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Start a new repository scan' })
  @ApiCreatedResponse({ type: ScanResponse })
  @ApiTooManyRequestsResponse({ description: 'Too many scan requests' })
  startScan(@Body() body: CreateScanRequest): ScanResponse {
    const scan = this.scanService.createScan(body.repositoryUrl);

    return new ScanResponse({
      ...scan.toSnapshot(),
      status: ScanStatus.Queued,
    });
  }

  @Get('health-check')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ description: 'Service is healthy' })
  healthCheck() {
    return { status: 'ok' };
  }

  @Get(':scanId')
  @ApiOperation({ summary: 'Get scan by ID' })
  @ApiOkResponse({ type: ScanResponse })
  @ApiNotFoundResponse({ description: 'Scan not found' })
  getScan(@Param('scanId') scanId: string): ScanResponse {
    const scan = this.scanService.findScan(scanId);

    if (!scan) {
      throw new NotFoundException();
    }

    return new ScanResponse(scan.toSnapshot());
  }
}
