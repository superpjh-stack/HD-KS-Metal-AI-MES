import { Injectable, NotFoundException } from '@nestjs/common';
import { LotRepository } from './lot.repository';
import { TraceLotUseCase } from './trace-lot.usecase';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotStatusDto } from './dto/update-lot-status.dto';
import { QueryLotDto } from './dto/query-lot.dto';

@Injectable()
export class LotService {
  constructor(
    private readonly lotRepo: LotRepository,
    private readonly traceLotUseCase: TraceLotUseCase,
  ) {}

  async create(dto: CreateLotDto, userId: string) {
    return this.lotRepo.create(dto, userId);
  }

  async findOne(id: string) {
    const lot = await this.lotRepo.findById(id);
    if (!lot) throw new NotFoundException(`LOT를 찾을 수 없습니다: ${id}`);
    return lot;
  }

  async findMany(query: QueryLotDto) {
    const { data, total } = await this.lotRepo.findMany(query);
    return { data, total, page: query.page, limit: query.limit };
  }

  async updateStatus(id: string, dto: UpdateLotStatusDto) {
    await this.findOne(id);
    return this.lotRepo.updateStatus(id, dto.status);
  }

  async trace(id: string) {
    return this.traceLotUseCase.execute(id);
  }
}
