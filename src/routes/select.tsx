import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMmpi, mmpiStore } from "@/lib/mmpi-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export const Route = createFileRoute("/select")({
  component: SelectPage,
});

type FilterKey = "tanggalTes" | "nama" | "tempatTes";

function SelectPage() {
  const navigate = useNavigate();
  const { data, selectedIndices, sourceLabel } = useMmpi();
  const [filters, setFilters] = useState<Record<FilterKey, string>>({ tanggalTes: "", nama: "", tempatTes: "" });

  useEffect(() => {
    if (!data) navigate({ to: "/" });
  }, [data, navigate]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.participants.filter((p) =>
      (!filters.tanggalTes || p.tanggalTes.toLowerCase().includes(filters.tanggalTes.toLowerCase())) &&
      (!filters.nama || p.nama.toLowerCase().includes(filters.nama.toLowerCase())) &&
      (!filters.tempatTes || p.tempatTes.toLowerCase().includes(filters.tempatTes.toLowerCase())),
    );
  }, [data, filters]);

  if (!data) return null;

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selectedIndices.has(p.rowIndex));

  function toggleAll() {
    if (allFilteredSelected) {
      const remaining = new Set(selectedIndices);
      filtered.forEach((p) => remaining.delete(p.rowIndex));
      mmpiStore.set({ selectedIndices: remaining });
    } else {
      const next = new Set(selectedIndices);
      filtered.forEach((p) => next.add(p.rowIndex));
      mmpiStore.set({ selectedIndices: next });
    }
  }

  function next() {
    if (selectedIndices.size === 0) return toast.error("Select at least one participant");
    navigate({ to: "/download" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Select participants</h1>
          <p className="text-sm text-muted-foreground">
            Source: <span className="font-medium text-foreground">{sourceLabel}</span> · {data.participants.length} rows · {selectedIndices.size} selected
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/" })}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <Button onClick={next}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="px-4 py-3 text-left font-semibold">Number</th>
                <HeaderFilter label="Tanggal Tes" value={filters.tanggalTes} onChange={(v) => setFilters({ ...filters, tanggalTes: v })} />
                <HeaderFilter label="Nama" value={filters.nama} onChange={(v) => setFilters({ ...filters, nama: v })} />
                <HeaderFilter label="Tempat Tes" value={filters.tempatTes} onChange={(v) => setFilters({ ...filters, tempatTes: v })} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const checked = selectedIndices.has(p.rowIndex);
                return (
                  <tr
                    key={p.rowIndex}
                    className={`border-t border-border transition hover:bg-accent/40 ${checked ? "bg-accent/30" : ""}`}
                    onClick={() => mmpiStore.toggle(p.rowIndex)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={checked} onCheckedChange={() => mmpiStore.toggle(p.rowIndex)} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{p.number}</td>
                    <td className="px-4 py-3 tabular-nums">{p.tanggalTes}</td>
                    <td className="px-4 py-3 font-medium">{p.nama}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.tempatTes}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No matching participants</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function HeaderFilter({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <th className="px-4 py-3 text-left font-semibold">
      <Popover>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition">
            {label}
            <Filter className={`h-3.5 w-3.5 ${value ? "text-primary" : "opacity-60"}`} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Filter {label}</p>
            <div className="flex gap-2">
              <Input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} />
              {value && (
                <Button size="icon" variant="ghost" onClick={() => onChange("")}><X className="h-4 w-4" /></Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </th>
  );
}