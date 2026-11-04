import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDF_SCENARIOS, PDF_TEMPLATES, sampleModel } from "./lib/billing-pdf-samples";

async function main() {
  const { renderBillingPdf } = await import("../src/lib/billing/pdf/render");
  const directory = path.join(process.cwd(), "tmp/billing-samples");
  await mkdir(directory, { recursive: true });
  for (const template of PDF_TEMPLATES) {
    for (const scenario of PDF_SCENARIOS) {
      const pdf = await renderBillingPdf(await sampleModel(scenario, template));
      const filename = `${template}-${scenario}.pdf`;
      await writeFile(path.join(directory, filename), pdf);
      console.log(`${filename}: ${pdf.length} bytes`);
    }
  }
  console.log("Wrote 16 billing sample PDFs to tmp/billing-samples.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
