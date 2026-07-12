"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { exportBulkEmailsCsvAction } from "@/app/(app)/emails/bulk/actions";
import { buttonClasses } from "@/components/ui/button";

export function ExportCsvButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const download = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { csv, filename } = await exportBulkEmailsCsvAction();
        // Prepend a UTF-8 BOM so Excel opens accented chars correctly.
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={download}
        disabled={isPending}
        className={buttonClasses("ghost", "md")}
      >
        <Download className="h-4 w-4" />
        {isPending ? "Exporting…" : "Export CSV"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
