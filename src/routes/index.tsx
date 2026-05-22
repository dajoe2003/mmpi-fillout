import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { parseFile } from "@/lib/mmpi-parser";
import { mmpiStore } from "@/lib/mmpi-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const data = await parseFile(file);
      mmpiStore.setData(data, file.name);
      toast.success(`Loaded ${data.participants.length} participants from ${file.name}`);
      navigate({ to: "/select" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Convert responses to MMPI-2 DAT</h1>
      </div>

      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Select input source</CardTitle>
        </CardHeader>
        <CardContent>
          <Label
            htmlFor="file-input"
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/40 px-8 py-16 text-center transition hover:bg-muted"
          >
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Click to upload CSV</p>
              <p className="text-sm text-muted-foreground">Local processing — your data never leaves your browser.</p>
            </div>
            <Input
              id="file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFile}
              disabled={loading}
            />
          </Label>
          {loading && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing file…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
