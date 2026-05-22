import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useMmpi } from "@/lib/mmpi-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, FileSpreadsheet } from "lucide-react";
import { buildDAT, buildParticipantsXLSX, downloadBlob, timestamp } from "@/lib/mmpi-parser";
import { toast } from "sonner";

export const Route = createFileRoute("/download")({
  component: DownloadPage,
});

function DownloadPage() {
  const navigate = useNavigate();
  const { data, selectedIndices } = useMmpi();

  useEffect(() => {
    if (!data) navigate({ to: "/" });
    else if (selectedIndices.size === 0) navigate({ to: "/select" });
  }, [data, selectedIndices, navigate]);

  const selected = useMemo(() => {
    if (!data) return [];
    return data.participants.filter((p) => selectedIndices.has(p.rowIndex));
  }, [data, selectedIndices]);

  if (!data || selected.length === 0) return null;

  function downloadDAT() {
    const text = buildDAT(selected);
    const name = `mmpi_output_${timestamp()}.dat`;
    downloadBlob(text, name, "text/plain");
    toast.success(`Downloaded ${name}`);
  }

  function downloadXLS() {
    const buf = buildParticipantsXLSX(selected);
    const name = `mmpi_participants_${timestamp()}.xlsx`;
    downloadBlob(buf, name, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    toast.success(`Downloaded ${name}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Download files</h1>
          <p className="text-sm text-muted-foreground">{selected.length} participant{selected.length === 1 ? "" : "s"} ready for export.</p>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/select" })}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><FileText className="h-5 w-5" /></div>
              <div>
                <CardTitle>MMPI-2 DAT</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadDAT} className="w-full">Download .dat</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><FileSpreadsheet className="h-5 w-5" /></div>
              <div>
                <CardTitle>Participants XLSX</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadXLS} variant="secondary" className="w-full">Download .xlsx</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}