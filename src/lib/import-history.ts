import { api } from "@/lib/api";

/**
 * Logs an import run in import_history for audit trail.
 */
export async function logImportRun(params: {
  sourceId: string;
  versionLabel: string;
  recordCount: number;
  recordsInserted?: number;
  recordsUpdated?: number;
  recordsDeleted?: number;
  errors: number;
}): Promise<void> {
  try {
    await api.post("/import-history", {
      source_id: params.sourceId,
      version_label: params.versionLabel,
      record_count: params.recordCount,
      records_inserted: params.recordsInserted ?? params.recordCount,
      records_updated: params.recordsUpdated ?? 0,
      records_deleted: params.recordsDeleted ?? 0,
      orphan_keys_detected: 0,
      status: params.errors === 0 ? "success" : "audit_warning",
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to log import history:", err);
  }
}
