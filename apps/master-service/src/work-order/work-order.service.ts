import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderRepository } from './work-order.repository';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './dto/create-work-order.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class WorkOrderService {
  constructor(private readonly woRepo: WorkOrderRepository) {}

  async create(dto: CreateWorkOrderDto, userId: string) {
    return this.woRepo.create(dto, userId);
  }

  async findOne(id: string) {
    const wo = await this.woRepo.findById(id);
    if (!wo) throw new NotFoundException(`작업지시를 찾을 수 없습니다: ${id}`);
    return wo;
  }

  async findMany(
    query: PaginationDto,
    machineId?: string,
    status?: string,
    operatorId?: string,
  ) {
    const { data, total } = await this.woRepo.findMany(query, { machineId, status, operatorId });
    return { data, total, page: query.page, limit: query.limit };
  }

  async update(
    id: string,
    dto: UpdateWorkOrderDto,
    requestingUserId?: string,
    isOperator = false,
  ) {
    const wo = await this.findOne(id);
    if (isOperator && wo.operatorId !== requestingUserId) {
      throw new ForbiddenException('자신에게 배정된 작업지시만 수정할 수 있습니다.');
    }
    return this.woRepo.update(id, dto);
  }
}
