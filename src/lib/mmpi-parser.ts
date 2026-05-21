import * as XLSX from "xlsx";

export interface Participant {
  rowIndex: number;
  number: number;
  tanggalTes: string; // dd/mm/yyyy
  nama: string;
  tempatTes: string;
  nomorRM: string;
  nomorHP: string;
  alamat: string;
  raw: unknown[];
}

export interface ParsedData {
  headers: string[];
  rows: unknown[][];
  participants: Participant[];
}

// Excel serial date -> JS Date (treat as days since 1899-12-30, UTC)
function serialToDate(serial: number): Date {
  const ms = Math.round(serial * 86400 * 1000);
  return new Date(Date.UTC(1899, 11, 30) + ms);
}

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" && value >= 10000) return serialToDate(value);
  if (typeof value === "string") {
    const s = value.trim();
    // Numeric string serial
    if (/^\d+(\.\d+)?$/.test(s) && Number(s) >= 10000) return serialToDate(Number(s));
    // MM/DD/YYYY or M/D/YYYY [HH:MM[:SS] [AM/PM]]
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?$/);
    if (m) {
      const [, mo, d, y, hh, mm, ss, ap] = m;
      let h = hh ? parseInt(hh, 10) : 0;
      if (ap) {
        const up = ap.toUpperCase();
        if (up === "PM" && h < 12) h += 12;
        if (up === "AM" && h === 12) h = 0;
      }
      return new Date(
        parseInt(y, 10),
        parseInt(mo, 10) - 1,
        parseInt(d, 10),
        h,
        mm ? parseInt(mm, 10) : 0,
        ss ? parseInt(ss, 10) : 0,
      );
    }
    // ISO
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
  }
  return null;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function formatDDMMYYYY(d: Date): string {
  return `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`;
}
function formatDateSlash(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function formatHHMM(d: Date): string {
  return `${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function cellString(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

export async function parseFile(file: File): Promise<ParsedData> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
  return buildParsed(rows);
}

export async function parseCSVText(text: string): Promise<ParsedData> {
  const wb = XLSX.read(text, { type: "string" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
  return buildParsed(rows);
}

export async function fetchGoogleSheet(url: string): Promise<ParsedData> {
  const csvUrl = googleSheetToCSVUrl(url);
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to fetch Google Sheet (${res.status}). Make sure it's shared as 'Anyone with the link'.`);
  const text = await res.text();
  return parseCSVText(text);
}

function googleSheetToCSVUrl(url: string): string {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) throw new Error("Invalid Google Sheets URL");
  const id = m[1];
  const gidMatch = url.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

function buildParsed(rows: unknown[][]): ParsedData {
  if (!rows.length) return { headers: [], rows: [], participants: [] };
  const headers = (rows[0] as unknown[]).map((h) => cellString(h));
  const dataRows = rows.slice(1).filter((r) => r.some((c) => cellString(c) !== ""));
  const participants: Participant[] = dataRows.map((r, i) => {
    const colB = r[1];
    const colF = cellString(r[5]);
    const colO = cellString(r[14]);
    const date = toDate(colB);
    return {
      rowIndex: i,
      number: i + 1,
      tanggalTes: date ? formatDateSlash(date) : cellString(colB),
      nama: colF,
      tempatTes: colO,
      nomorRM: cellString(r[12]), // col M? — guessing; spec lists Nomor RM in xls export
      nomorHP: cellString(r[6]),
      alamat: cellString(r[10]),
      raw: r,
    };
  });
  return { headers, rows: dataRows, participants };
}

// Build a single DAT line of exactly 686 chars + newline.
export function buildDATLine(row: unknown[]): string {
  const fixed = "000000000000000000000 Y 0000 #0001    N "; // 40
  const nama = padField(cellString(row[5]).toUpperCase(), 25);
  const subId = padField(cellString(row[0]).slice(0, 8), 8);
  const dob = toDate(row[8]);
  const dobStr = dob ? formatDDMMYYYY(dob) : "        ";
  const start = toDate(row[2]);
  const startStr = start ? formatHHMM(start) : "    ";
  const last = toDate(row[1]);
  const lastStr = last ? formatHHMM(last) : "    ";
  const jk = padField(normalizeJK(cellString(row[7])), 6);
  const status = padField(normalizeStatus(cellString(row[12])), 11);
  const pend = padField(normalizePendidikan(cellString(row[11])), 11);

  // Answers from col Q (index 16) onward — exactly 567 items.
  let answers = "";
  for (let i = 0; i < 567; i++) {
    const v = cellString(row[16 + i]).toLowerCase();
    if (v === "ya" || v === "y" || v === "true" || v === "+") answers += "+";
    else if (v === "tidak" || v === "t" || v === "n" || v === "no" || v === "false" || v === "-") answers += "-";
    else answers += " ";
  }

  let line = fixed + nama + subId + dobStr + startStr + lastStr + jk + status + pend + answers;
  // Pad to 685, then add trailing space to reach 686
  if (line.length < 685) line = line.padEnd(685, " ");
  else line = line.slice(0, 685);
  line += " ";
  return line + "\n";
}

function padField(s: string, len: number): string {
  s = (s || "").slice(0, len);
  return s.padEnd(len, " ");
}
function normalizeJK(s: string): string {
  const u = s.toUpperCase();
  if (u.startsWith("L") || u.includes("PRIA") || u.includes("MALE")) return "PRIA";
  if (u.startsWith("P") || u.startsWith("W") || u.includes("WANITA") || u.includes("FEMALE")) return "WANITA";
  return "";
}
function normalizeStatus(s: string): string {
  const u = s.toUpperCase();
  if (u.includes("BELUM") || u.includes("BLM")) return "BLM KAWIN";
  if (u.includes("DUDA")) return "DUDA";
  if (u.includes("JANDA")) return "JANDA";
  if (u.includes("KAWIN") || u.includes("MENIKAH") || u.includes("MARRIED")) return "KAWIN";
  return u;
}
function normalizePendidikan(s: string): string {
  const u = s.toUpperCase().replace(/\s+/g, "");
  if (u.includes("S3") || u.includes("DOKTOR")) return "S3";
  if (u.includes("S2") || u.includes("MAGISTER")) return "S2";
  if (u.includes("S1") || u.includes("SARJANA") || u.includes("D4") || u.includes("D3")) return "S1";
  if (u.includes("SMA") || u.includes("SMK") || u.includes("MA") || u.includes("SLTA")) return "SMA/SMK";
  if (u.includes("SMP") || u.includes("MTS") || u.includes("SLTP")) return "SMP";
  if (u.includes("SD")) return "SD";
  return s.toUpperCase();
}

export function buildDAT(participants: Participant[]): string {
  return participants.map((p) => buildDATLine(p.raw as unknown[])).join("");
}

export function buildParticipantsXLSX(participants: Participant[]): Uint8Array {
  const data = [
    ["Number", "Tanggal Tes", "Nama", "Nomor RM", "Nomor HP", "Tempat Tes", "Alamat"],
    ...participants.map((p) => [p.number, p.tanggalTes, p.nama, p.nomorRM, p.nomorHP, p.tempatTes, p.alamat]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

export function timestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function downloadBlob(data: BlobPart, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}