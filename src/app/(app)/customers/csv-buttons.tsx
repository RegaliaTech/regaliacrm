"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download } from "lucide-react";
import {
  importCustomersFromCsvAction,
  exportCustomersCsvAction,
  type ImportCustomersResult,
} from "@/app/(app)/customers/actions";
import { parseCsv } from "@/lib/csv";
import { buttonClasses } from "@/components/ui/button";

function pickColumn(headers: string[], candidates: string[]): number {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const canon = headers.map(norm);
  for (const c of candidates) {
    const idx = canon.indexOf(norm(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function CustomersCsvButtons() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const [exporting, startExport] = useTransition();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setError(null);
    try {
      const text = await file.text();
      const { header, rows } = parseCsv(text, { hasHeader: true });

      const emailIdx = pickColumn(header, [
        "email",
        "emailaddress",
        "mail",
        "mailid",
      ]);
      const nameIdx = pickColumn(header, [
        "name",
        "contactname",
        "owner",
        "ownername",
        "contact",
      ]);
      const companyIdx = pickColumn(header, [
        "company",
        "companyname",
        "business",
        "organisation",
        "organization",
      ]);
      const phoneIdx = pickColumn(header, [
        "phone",
        "phonenumber",
        "mobile",
        "mobilenumber",
        "contactnumber",
      ]);
      const addressIdx = pickColumn(header, [
        "address",
        "location",
        "companyaddress",
      ]);
      const websiteIdx = pickColumn(header, ["website", "url", "site"]);
      const emailCol = emailIdx >= 0 ? emailIdx : 0;

      const payload = rows
        .map((r) => ({
          email: (r[emailCol] ?? "").trim(),
          name: nameIdx >= 0 ? (r[nameIdx] ?? "").trim() : undefined,
          company: companyIdx >= 0 ? (r[companyIdx] ?? "").trim() : undefined,
          phone: phoneIdx >= 0 ? (r[phoneIdx] ?? "").trim() : undefined,
          address: addressIdx >= 0 ? (r[addressIdx] ?? "").trim() : undefined,
          website: websiteIdx >= 0 ? (r[websiteIdx] ?? "").trim() : undefined,
        }))
        .filter((r) => r.email);

      if (payload.length === 0) {
        setError(
          "No rows had an email. Include an 'email' column (or put emails in the first column).",
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      startImport(async () => {
        try {
          const r: ImportCustomersResult =
            await importCustomersFromCsvAction(payload);
          const parts: string[] = [];
          if (r.created) parts.push(`${r.created} new`);
          if (r.updated) parts.push(`${r.updated} updated`);
          if (r.skipped) parts.push(`${r.skipped} unchanged`);
          if (r.invalid) parts.push(`${r.invalid} invalid`);
          setStatus(parts.length ? `Imported: ${parts.join(", ")}.` : "Nothing to import.");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Import failed");
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    setStatus(null);
    setError(null);
    startExport(async () => {
      try {
        const { csv, filename } = await exportCustomersCsvAction();
        const blob = new Blob(["﻿", csv], {
          type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleUpload}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className={buttonClasses("ghost", "md")}
      >
        <Upload className="h-4 w-4" />
        {importing ? "Importing…" : "Import CSV"}
      </button>
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className={buttonClasses("ghost", "md")}
      >
        <Download className="h-4 w-4" />
        {exporting ? "Exporting…" : "Export CSV"}
      </button>
      {status && <span className="text-xs text-slate-600">{status}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
