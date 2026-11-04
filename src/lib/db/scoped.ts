import { sql } from 'drizzle-orm';
import { db, Transaction } from './index';
import { Actor } from '@/lib/domain/contracts';

export async function withActor<T>(actor: Actor, work: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('brain.organization_id', ${actor.organizationId}, true), set_config('brain.user_id', ${actor.userId}, true)`);
    return work(tx);
  });
}
