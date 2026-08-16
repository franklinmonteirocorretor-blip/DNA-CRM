import type { SupabaseClient } from "@supabase/supabase-js";
import { BufferJSON, initAuthCreds, proto, type AuthenticationCreds, type AuthenticationState, type SignalDataSet, type SignalDataTypeMap } from "@whiskeysockets/baileys";
import { config } from "./config.js";
import { decryptJson, encryptJson, type EncryptedValue } from "./crypto.js";
import { createGatewaySupabaseClient } from "./supabase-client.js";

type StoredRow = { ciphertext: string; iv: string; auth_tag: string; key_version: number; record_type: string; record_id: string };
type StoredWrite = { session_id: string; record_type: string; record_id: string; ciphertext: string; iv: string; auth_tag: string; key_version: number; updated_at: string };

const AUTH_BATCH_SIZE = 200;

function chunks<T>(values: T[], size = AUTH_BATCH_SIZE) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

export class SupabaseBaileysAuthStore {
  private readonly db: SupabaseClient;
  constructor(private readonly sessionId: string, db?: SupabaseClient) {
    this.db = db || createGatewaySupabaseClient();
  }

  private serialize(value: unknown) { return JSON.parse(JSON.stringify(value, BufferJSON.replacer)); }
  private deserialize<T>(value: unknown) { return JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T; }

  private async read<T>(recordType: string, recordId: string): Promise<T | null> {
    const { data, error } = await this.db.from("whatsapp_auth_state").select("ciphertext,iv,auth_tag,key_version,record_type,record_id").eq("session_id", this.sessionId).eq("record_type", recordType).eq("record_id", recordId).maybeSingle<StoredRow>();
    if (error) throw new Error(`Auth state read falhou: ${error.code}`);
    if (!data) return null;
    return this.deserialize<T>(decryptJson({ ciphertext: data.ciphertext, iv: data.iv, authTag: data.auth_tag, keyVersion: data.key_version } satisfies EncryptedValue, config.encryptionKey));
  }

  private async write(recordType: string, recordId: string, value: unknown) {
    const encrypted = encryptJson(this.serialize(value), config.encryptionKey);
    const { error } = await this.db.from("whatsapp_auth_state").upsert({ session_id: this.sessionId, record_type: recordType, record_id: recordId, ciphertext: encrypted.ciphertext, iv: encrypted.iv, auth_tag: encrypted.authTag, key_version: encrypted.keyVersion, updated_at: new Date().toISOString() });
    if (error) throw new Error(`Auth state write falhou: ${error.code}`);
  }

  private async readMany<T>(recordType: string, recordIds: string[]): Promise<Record<string, T>> {
    const values: Record<string, T> = {};
    for (const recordIdBatch of chunks(recordIds)) {
      const { data, error } = await this.db
        .from("whatsapp_auth_state")
        .select("ciphertext,iv,auth_tag,key_version,record_type,record_id")
        .eq("session_id", this.sessionId)
        .eq("record_type", recordType)
        .in("record_id", recordIdBatch);
      if (error) throw new Error(`Auth state batch read falhou: ${error.code}`);
      for (const row of (data || []) as StoredRow[]) {
        values[row.record_id] = this.deserialize<T>(decryptJson({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag, keyVersion: row.key_version } satisfies EncryptedValue, config.encryptionKey));
      }
    }
    return values;
  }

  private async writeMany(rows: Array<{ recordType: string; recordId: string; value: unknown }>) {
    const now = new Date().toISOString();
    const writes: StoredWrite[] = rows.map(({ recordType, recordId, value }) => {
      const encrypted = encryptJson(this.serialize(value), config.encryptionKey);
      return { session_id: this.sessionId, record_type: recordType, record_id: recordId, ciphertext: encrypted.ciphertext, iv: encrypted.iv, auth_tag: encrypted.authTag, key_version: encrypted.keyVersion, updated_at: now };
    });
    for (const writeBatch of chunks(writes)) {
      const { error } = await this.db.from("whatsapp_auth_state").upsert(writeBatch);
      if (error) throw new Error(`Auth state batch write falhou: ${error.code}`);
    }
  }

  private async removeMany(rows: Array<{ recordType: string; recordId: string }>) {
    const byType = new Map<string, string[]>();
    for (const row of rows) byType.set(row.recordType, [...(byType.get(row.recordType) || []), row.recordId]);
    for (const [recordType, recordIds] of byType) {
      for (const recordIdBatch of chunks(recordIds)) {
        const { error } = await this.db.from("whatsapp_auth_state").delete().eq("session_id", this.sessionId).eq("record_type", recordType).in("record_id", recordIdBatch);
        if (error) throw new Error(`Auth state batch delete falhou: ${error.code}`);
      }
    }
  }

  private async remove(recordType: string, recordId: string) {
    const { error } = await this.db.from("whatsapp_auth_state").delete().eq("session_id", this.sessionId).eq("record_type", recordType).eq("record_id", recordId);
    if (error) throw new Error(`Auth state delete falhou: ${error.code}`);
  }

  async load(): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void>; clear: () => Promise<void> }> {
    const creds = (await this.read<AuthenticationCreds>("creds", "main")) || initAuthCreds();
    const state: AuthenticationState = {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const values: { [id: string]: SignalDataTypeMap[T] } = {};
          const stored = await this.readMany<SignalDataTypeMap[T]>(type, ids);
          for (const id of ids) {
            let value = stored[id];
            if (type === "app-state-sync-key" && value) value = proto.Message.AppStateSyncKeyData.fromObject(value as Record<string, unknown>) as unknown as SignalDataTypeMap[T];
            if (value) values[id] = value;
          }
          return values;
        },
        set: async (data: SignalDataSet) => {
          const writes: Array<{ recordType: string; recordId: string; value: unknown }> = [];
          const removals: Array<{ recordType: string; recordId: string }> = [];
          for (const [type, records] of Object.entries(data)) {
            for (const [id, value] of Object.entries(records || {})) {
              if (value == null) removals.push({ recordType: type, recordId: id });
              else writes.push({ recordType: type, recordId: id, value });
            }
          }
          if (writes.length) await this.writeMany(writes);
          if (removals.length) await this.removeMany(removals);
        },
        clear: async () => { await this.clearAll(); },
      },
    };
    return { state, saveCreds: () => this.write("creds", "main", creds), clear: () => this.clearAll() };
  }

  private async clearAll() {
    const { error } = await this.db.from("whatsapp_auth_state").delete().eq("session_id", this.sessionId);
    if (error) throw new Error(`Auth state clear falhou: ${error.code}`);
  }
}
