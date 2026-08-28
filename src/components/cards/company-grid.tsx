"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoPlate } from "@/components/cards/logo-plate";

export type CompanySummary = {
  slug: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  primary: string;
  accent: string;
  cardCount: number;
};

/**
 * Filtering happens in the browser: an agency has tens of companies, not
 * thousands, so a round trip per keystroke would be slower and no more correct.
 * Revisit if a single account ever holds enough to make this list heavy.
 */
export function CompanyGrid({ companies }: { companies: CompanySummary[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((company) =>
      [company.name, company.tagline ?? ""].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [companies, query]);

  return (
    <>
      <div className="relative mt-8">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search companies"
          aria-label="Search companies"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No company matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company, index) => (
            <Link
              key={company.slug}
              href={`/dashboard/companies/${company.slug}`}
              className="group"
              /* Stagger so the grid arrives in sequence rather than all at once. */
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <Card className="h-full overflow-hidden transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:shadow-md">
                {/* A sliver of the company's own palette, so the grid is
                    scannable by brand rather than by reading every name. */}
                <div
                  className="h-1.5 w-full"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${company.primary}, ${company.accent})`,
                  }}
                />
                <CardContent className="p-5">
                  <div className="flex h-9 items-center">
                    <LogoPlate
                      src={company.logoUrl}
                      name={company.name}
                      className="h-9 max-w-[75%]"
                    />
                  </div>

                  <h2 className="mt-4 truncate font-medium">{company.name}</h2>
                  {company.tagline && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {company.tagline}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {company.cardCount} card{company.cardCount === 1 ? "" : "s"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
