const AIRTABLE_API = "https://api.airtable.com/v0";

function authHeaders() {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) throw new Error("AIRTABLE_API_KEY not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function baseId() {
  const id = process.env.AIRTABLE_BASE_ID;
  if (!id) throw new Error("AIRTABLE_BASE_ID not set");
  return id;
}

export type AirtableRecord<T> = {
  id: string;
  fields: T;
  createdTime: string;
};

export async function listRecords<T>(table: string): Promise<AirtableRecord<T>[]> {
  const records: AirtableRecord<T>[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`${AIRTABLE_API}/${baseId()}/${encodeURIComponent(table)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error(`Airtable list failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

export async function createRecord<T>(table: string, fields: T): Promise<AirtableRecord<T>> {
  const res = await fetch(`${AIRTABLE_API}/${baseId()}/${encodeURIComponent(table)}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ records: [{ fields }] }),
  });
  if (!res.ok) throw new Error(`Airtable create failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.records[0];
}

export async function updateRecord<T>(table: string, id: string, fields: Partial<T>): Promise<AirtableRecord<T>> {
  const res = await fetch(`${AIRTABLE_API}/${baseId()}/${encodeURIComponent(table)}/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable update failed: ${res.status} ${await res.text()}`);
  return await res.json();
}
