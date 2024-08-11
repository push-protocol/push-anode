import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "./pagination-meta.dto";

export class PaginatedResponseDto<T> {
  @ApiProperty({
    isArray: true,
    description: "List of items for the current page",
  })
  items: T[];

  @ApiProperty({
    type: PaginationMeta,
    description: "Pagination metadata",
  })
  meta: PaginationMeta;

  constructor(items: T[], meta: PaginationMeta) {
    this.items = items;
    this.meta = meta;
  }
}
