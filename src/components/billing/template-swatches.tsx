"use client";

type Choice = { value: string; label: string };

export function TemplateSwatches({ templates, value, onChange }: { templates: Choice[]; value: string; onChange: (value: string) => void }) {
  return <div className="flex flex-wrap gap-3" role="group" aria-label="Template previews">
    {templates.map((template) => {
      const astro = template.value === "astro";
      const bold = template.value === "bold";
      const minimal = template.value === "minimal";
      const active = value === template.value;
      return <button key={template.value} type="button" aria-pressed={active} onClick={() => onChange(template.value)} className={`group w-20 rounded-md text-left transition-[opacity,transform] duration-(--fast) ease-(--ease) hover:-translate-y-0.5 hover:opacity-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:transform-none ${active ? "opacity-100" : "opacity-55"}`}>
        <div aria-hidden="true" className={`relative h-24 overflow-hidden rounded border shadow-sm ${astro ? "border-[#727272] bg-[#1f1f1e]" : "border-neutral-300 bg-white"}`}>
          {!minimal && <div className={`${bold ? "h-6 bg-slate-800" : astro ? "h-1 bg-[#f7ad19]" : "h-1 bg-slate-800"}`} />}
          <div className="space-y-2 p-2">
            <div className={`h-1 w-7 ${astro ? "bg-white" : "bg-slate-700"}`} />
            <div className={`ml-auto h-1 w-5 ${astro ? "bg-[#767676]" : "bg-neutral-300"}`} />
            {[0, 1, 2].map((n) => <div key={n} className={`${bold || astro ? "h-2 rounded border" : "h-1 border-b"} ${astro ? "border-[#727272] bg-[#262624]" : "border-neutral-200"}`} />)}
            <div className={`ml-auto h-1.5 w-7 ${minimal ? "border-b border-amber-500" : astro ? "border border-[#f7ad19]" : "bg-slate-700"}`} />
          </div>
        </div>
        <span className="mt-1.5 block text-xs">{astro ? "Your design" : template.label}</span>
      </button>;
    })}
  </div>;
}
