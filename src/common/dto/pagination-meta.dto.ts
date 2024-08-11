import { ApiProperty } from "@nestjs/swagger";

export class PaginationMeta {
  @ApiProperty({
    example: 1,
    description: "The current page number",
  })
  currentPage: number;

  @ApiProperty({
    example: 10,
    description: "The number of items per page",
  })
  pageSize: number;

  @ApiProperty({
    example: 100,
    description: "The total number of items across all pages",
  })
  totalItems: number;

  @ApiProperty({
    example: 10,
    description: "The total number of pages available",
  })
  totalPages: number;

  constructor(
    currentPage: number,
    pageSize: number,
    totalItems: number,
    totalPages: number
  ) {
    this.currentPage = currentPage;
    this.pageSize = pageSize;
    this.totalItems = totalItems;
    this.totalPages = totalPages;
  }
}
