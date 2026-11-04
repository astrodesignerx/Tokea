import { renderToBuffer } from "@react-pdf/renderer";
import { registerBillingFonts } from "./fonts";
import { resolvePdfTemplate, type PdfDocument } from "./model";
import { ClassicTemplate } from "./templates/classic";
import { MinimalTemplate } from "./templates/minimal";
import { BoldTemplate } from "./templates/bold";
import { AstroTemplate } from "./templates/astro";

export async function renderBillingPdf(model: PdfDocument): Promise<Buffer> {
  registerBillingFonts();
  const template = resolvePdfTemplate(model.template, model.privateTemplate);
  const Template = template === "astro" ? AstroTemplate : template === "bold" ? BoldTemplate : template === "minimal" ? MinimalTemplate : ClassicTemplate;
  return renderToBuffer(<Template model={model} />);
}
