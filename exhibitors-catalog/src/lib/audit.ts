import { db } from "./db";

/** Записва действие в журнала (не спира основната операция при грешка). */
export async function audit(
  userId: string | null,
  action: "create" | "update" | "delete" | "import",
  entity: "Exhibitor" | "Exhibition" | "Category" | "User",
  entityId: string | null,
  summary?: string,
) {
  try {
    await db.auditLog.create({ data: { userId, action, entity, entityId, summary } });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
