import type { PagedResult } from '../../../core/models/paged-result';
import type { TriageBoardItemDto } from '../../../core/models/triage-board';

export function boardItem(overrides: Partial<TriageBoardItemDto> = {}): TriageBoardItemDto {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    fullName: 'Fictional Board Patient',
    age: 42,
    chiefComplaint: 'Fictional complaint',
    arrivalTime: '2026-10-20T10:00:00Z',
    currentPriority: 2,
    calculatedPriority: 2,
    priorityReason: 'Opaque server reason',
    isOverridden: false,
    overrideReason: null,
    status: 'Waiting',
    waitingMinutes: 35,
    waitingLevel: 'Warning',
    allowedTransitions: ['InTreatment'],
    ...overrides,
  };
}

export function boardPage(
  items: readonly TriageBoardItemDto[] = [boardItem()],
  metadata: Partial<Omit<PagedResult<TriageBoardItemDto>, 'items'>> = {},
): PagedResult<TriageBoardItemDto> {
  return {
    items,
    totalCount: items.length,
    pageNumber: 1,
    pageSize: 10,
    totalPages: items.length ? 1 : 0,
    ...metadata,
  };
}
