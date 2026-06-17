import { AuditLog } from '../models';

export const createAuditLog = async (
  userId: number,
  action: string,
  entityType: string,
  entityId: number,
  previousValue?: object | null,
  newValue?: object | null,
  ipAddress?: string
): Promise<void> => {
  try {
    await AuditLog.create({
      user_id:        userId,
      action,
      entity_type:    entityType,
      entity_id:      entityId,
      previous_value: previousValue ?? null,
      new_value:      newValue      ?? null,
      ip_address:     ipAddress     ?? null,
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
};