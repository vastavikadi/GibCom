import { Actor } from '@/lib/domain/contracts';

export interface SourcePolicy {
  organizationId: string;
  accessPolicy: string | null;
  uploadedBy: string | null;
  allowedUserIds: string[] | null;
  allowedRoles: string[] | null;
  status: string | null;
}

export function canReadSource(actor: Actor, source: SourcePolicy): boolean {
  if (actor.organizationId !== source.organizationId || source.status === 'deleted') return false;
  if (!source.accessPolicy || source.accessPolicy === 'organization') return true;
  if (source.accessPolicy === 'private') return source.uploadedBy === actor.userId;
  if (source.accessPolicy === 'restricted') {
    return (
      source.uploadedBy === actor.userId ||
      !!source.allowedUserIds?.includes(actor.userId) ||
      !!source.allowedRoles?.includes(actor.role)
    );
  }
  return true;
}

// If no restrictive evidence source IDs are attached, item is visible within the organization.
// If sources are attached, all attached sources must be accessible to the actor.
export function allEvidenceVisible(ids: readonly string[] | null | undefined, visible: ReadonlySet<string>): boolean {
  if (!ids || ids.length === 0) return true;
  return ids.every((id) => !id || visible.has(id));
}
