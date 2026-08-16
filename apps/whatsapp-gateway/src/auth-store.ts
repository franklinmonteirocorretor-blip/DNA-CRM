import type { SupabaseClient } from "@supabase/supabase-js";
import { BufferJSON, initAuthCreds, proto, type AuthenticationCreds, type AuthenticationState, type SignalDataSet, type SignalDataTypeMap } from "@whiskeysockets/baileys";
import { config } from "./config.js";
import { decryptJson, encryptJson, type EncryptedValue } from "./crypto.js";
import { createGatewaySupabaseClient } from "./supabase-client.js";

type StoredRow = { ciphertext: string; iv: string; auth_tag: string; key_version: number; record_type: string; record_id: string };

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
          await Promise.all(ids.map(async id => {
            let value = await this.read<SignalDataTypeMap[T]>(type, id);
            if (type === "app-state-sync-key" && value) value = proto.Message.AppStateSyncKeyData.fromObject(value as Record<string, unknown>) as unknown as SignalDataTypeMap[T];
            if (value) values[id] = value;
          }));
          return values;
        },
        set: async (data: SignalDataSet) => {
          const work: Promise<void>[] = [];
          for (const [type, records] of Object.entries(data)) for (const [id, value] of Object.entries(records || {})) work.push(value == null ? this.remove(type, id) : this.write(type, id, value));
          await Promise.all(work);
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
