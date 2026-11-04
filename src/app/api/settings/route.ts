import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { api,requireMinimumRole } from '@/lib/api';
import { organizations } from '@/lib/db/schema';
import { audit } from '@/lib/domain/store';
export const PATCH=api(async(request,actor,tx)=>{requireMinimumRole(actor,'admin');const body=z.object({name:z.string().trim().min(1).max(150)}).parse(await request.json());await tx.update(organizations).set({name:body.name,updatedAt:new Date()}).where(eq(organizations.id,actor.organizationId));await audit(tx,actor,'organization_updated',actor.organizationId);return {saved:true};});
