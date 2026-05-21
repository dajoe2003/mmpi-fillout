import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Link2, Upload, Loader2 } from "lucide-react";
import { fetchGoogleSheet, parseFile } from "@/lib/mmpi-parser";
import { mmpiStore } from "@/lib/mmpi-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSheet(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return toast.error("Paste a Google Sheets URL");
    setLoading(true);
    try {
      const data = await fetchGoogleSheet(url.trim());
      mmpiStore.setData(data, "Google Sheet");
      toast.success(`Loaded ${data.participants.length} participants`);
      navigate({ to: "/select" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load sheet");
    } finally {
      setLoading(false);
    }
  }

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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Convert responses to MMPI-2 DAT</h1>
        <p className="text-muted-foreground">Start from a Google Sheet or upload an XLSX/CSV file of participant responses.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Select input source</CardTitle>
          <CardDescription>Google Sheet is recommended. Make sure the link is shared as “Anyone with the link can view”.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sheet" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="sheet"><Link2 className="mr-2 h-4 w-4" /> Google Sheet</TabsTrigger>
              <TabsTrigger value="file"><Upload className="mr-2 h-4 w-4" /> Upload File</TabsTrigger>
            </TabsList>

            <TabsContent value="sheet" className="mt-6">
              <form onSubmit={handleSheet} className="space-y-4 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="sheet-url">Google Sheets URL</Label>
                  <Input
                    id="sheet-url"
                    placeholder="https://docs.google.com/spreadsheets/d/…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                  Load Sheet
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="file" className="mt-6">
              <div className="space-y-4 max-w-2xl">
                <Label htmlFor="file-input" className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/40 px-6 py-12 text-center transition hover:bg-muted">
                  <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Click to upload XLSX or CSV</p>
                    <p className="text-sm text-muted-foreground">Local processing — your data never leaves your browser.</p>
                  </div>
                  <Input id="file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} disabled={loading} />
                </Label>
                {loading && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Parsing file…</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
