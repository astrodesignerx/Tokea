/* eslint-disable jsx-a11y/alt-text */
// These Image elements render PDF image objects, not HTML images.
import type { ReactNode } from "react";
import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfDocument, PdfItem } from "../model";

export const ASTRO = { page: "#1f1f1e", card: "#262624", head: "#30302e", muted: "#767676", border: "#727272", gold: "#f7ad19", red: "#c1121f" };
const s = StyleSheet.create({
  page: { paddingTop: 40, paddingHorizontal: 40, paddingBottom: 92, fontSize: 9, lineHeight: 1.25, color: "#202020" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 8, color: "#737373", letterSpacing: 1, marginBottom: 7 },
  meta: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 5 },
  item: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5" },
  head: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, fontSize: 7.5, color: "#666666" },
  title: { fontWeight: 600, marginBottom: 3 },
  description: { color: "#737373", fontSize: 8, lineHeight: 1.4 },
});

/** Choose the higher WCAG contrast against the actual fill. */
export function contrastText(hex: string): string {
  const value = /^#[\da-f]{6}$/i.test(hex) ? hex : "#111111";
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const blackLuminance = 0.0056; // #111111
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / (blackLuminance + 0.05) ? "#ffffff" : "#111111";
}

export function documentLabel(model: PdfDocument) {
  return model.type === "quote" ? "QUOTATION" : model.type.toUpperCase();
}

function contactLine(model: PdfDocument) {
  return [model.business.phone && `Tel: ${model.business.phone}`, model.business.email && `Email: ${model.business.email}`, model.business.socialHandle && `Social: ${model.business.socialHandle}`, model.business.website].filter(Boolean).join(" | ");
}

function footerHeight(model: PdfDocument, astro: boolean) {
  const lines = (text: string | null) => text ? text.split("\n").reduce((count, line) => count + Math.max(1, Math.ceil(line.length / 105)), 0) : 0;
  if (astro) {
    const contactLines = Math.max(...[model.business.phone, model.business.email, model.business.socialHandle].map((text) => text ? Math.ceil(text.length / 28) : 0));
    return lines(model.business.footerText) * 9.4 + contactLines * 13.4 + (model.business.footerText ? 4 : 0) + 22;
  }
  return (lines(model.business.footerText) + lines(contactLine(model))) * 9.4 + (model.business.footerText ? 4 : 0) + 6;
}

export function PdfPage({ model, astro = false, children }: { model: PdfDocument; astro?: boolean; children: ReactNode }) {
  return <Page size="A4" style={[s.page, { fontFamily: astro ? "Poppins" : model.brand.fontFamily }, ...(astro ? [{ backgroundColor: ASTRO.page, color: "#ffffff", paddingHorizontal: 36.5, paddingTop: 36.5 }] : []), { paddingBottom: Math.max(astro ? 80 : 78, footerHeight(model, astro) + (astro ? 18 : 40)) }]}>
    {children}
    <Footer model={model} astro={astro} />
  </Page>;
}

export function Business({ model, colour, astro = false }: { model: PdfDocument; colour?: string; astro?: boolean }) {
  return <View style={{ maxWidth: astro ? 115 : 220 }}>
    {model.business.logo ? <Image src={model.business.logo} style={{ width: astro ? 92 : 118, height: astro ? 115 : 58, objectFit: "contain", objectPosition: "left top" }} />
      : <Text style={{ fontSize: astro ? 22 : 18, lineHeight: 1.2, fontWeight: 600, color: colour }}>{model.business.name}</Text>}
    {!astro && <Text style={{ marginTop: 9, fontSize: 8, color: colour ?? "#737373" }}>{[model.business.address, model.business.phone, model.business.email, model.business.website, model.business.socialHandle].filter(Boolean).join("\n")}</Text>}
  </View>;
}

export function BillTo({ model, astro = false }: { model: PdfDocument; astro?: boolean }) {
  return <View style={{ width: "49%" }}>
    <Text style={[s.label, ...(astro ? [{ color: ASTRO.muted, fontSize: 11.5, lineHeight: 1.2, fontWeight: 600, letterSpacing: 1.1 }] : [])]}>{model.type === "receipt" ? "RECEIVED FROM:" : "BILL TO:"}</Text>
    <Text style={{ fontWeight: astro ? 500 : 600, fontSize: astro ? 10.3 : 10, lineHeight: 1.2}}>{model.billTo.name}</Text>
    <Text style={{ marginTop: 3, fontSize: astro ? 10.3 : 9, lineHeight: 1.2}}>{[model.billTo.company, model.billTo.address, model.billTo.phone, model.billTo.email].filter(Boolean).join("\n")}</Text>
  </View>;
}

export function Metadata({ model, astro = false, hideNumber = false }: { model: PdfDocument; astro?: boolean; hideNumber?: boolean }) {
  const rows: [string, string | null][] = model.type === "receipt" ? [
    ...(model.invoice ? [["Invoice Date", model.invoice.issueDate], ["Status", model.invoice.status]] as [string, string][] : []),
    ["Paid date", model.paidDate],
  ] : [["Date", model.issueDate], [model.type === "quote" ? "Validity" : "Due date", model.type === "quote" && model.validityDays !== null ? `Valid for ${model.validityDays} days` : model.dueDate], ["Payment Terms", model.type === "invoice" ? model.paymentTerms : null]];
  return <View style={{ width: "47%" }}>
    {!hideNumber && <Text style={{ textAlign: "right", fontSize: astro ? 12.8 : 10, lineHeight: 1.2, fontWeight: 500, color: astro ? ASTRO.muted : "#202020", marginBottom: astro ? 14 : 9 }}>{model.type === "receipt" && model.invoice ? `Invoice #${model.invoice.number.replace(/^#/, "")}` : `#${model.number.replace(/^#/, "")}`}</Text>}
    {rows.filter((row) => row[1]).map(([label, value]) => <View key={label} style={[s.meta, { fontSize: astro ? 9.9 : 8.5 }]}>
      <Text style={{ color: astro ? ASTRO.muted : "#737373", width: "42%" }}>{label}:</Text><Text style={{ textAlign: "right", width: "58%" }}>{value}</Text>
    </View>)}
    {model.type === "quote" && model.validUntil && !astro && <Text style={{ textAlign: "right", fontSize: 8, color: "#737373" }}>Valid until {model.validUntil}</Text>}
  </View>;
}

function ColumnHeader({ title, astro = false }: { title: string; astro?: boolean }) {
  return <View style={[s.head, { backgroundColor: astro ? ASTRO.head : "#f3f3f3", color: astro ? ASTRO.muted : "#666666", fontWeight: 600 }, ...(astro ? [{ fontSize: 9.6, letterSpacing: 0.6, paddingVertical: 9 }] : [])]}>
    <Text style={{ width: "58%" }}>{title}</Text><Text style={{ width: "7%", textAlign: "right" }}>QTY</Text><Text style={{ width: "17%", textAlign: "right" }}>RATE</Text><Text style={{ width: "18%", textAlign: "right" }}>AMOUNT</Text>
  </View>;
}

function TableRow({ item, astro = false }: { item: PdfItem; astro?: boolean }) {
  return <View wrap={false} style={[s.item, ...(astro ? [{ backgroundColor: ASTRO.card, borderBottomColor: ASTRO.border, paddingVertical: 8, fontSize: 9.6 }] : [])]}>
    <View style={{ width: "58%", paddingRight: 9 }}><Text style={s.title}>{item.title}</Text>{item.description && <Text style={[s.description, ...(astro ? [{ color: ASTRO.muted, fontSize: 8.3 }] : [])]}>{item.description}</Text>}</View>
    <Text style={{ width: "7%", textAlign: "right", color: astro ? ASTRO.muted : "#202020" }}>{item.quantity}</Text>
    <Text style={{ width: "17%", textAlign: "right", color: astro ? ASTRO.muted : "#202020", fontSize: astro ? 9 : 8 }}>{item.unitPrice}</Text>
    <Text style={{ width: "18%", textAlign: "right", fontWeight: 600, fontSize: astro ? 9 : 8 }}>{item.lineTotal}</Text>
  </View>;
}

export function ItemsTable({ model, astro = false, minimal = false }: { model: PdfDocument; astro?: boolean; minimal?: boolean }) {
  if (astro) return <View>{model.sections.map((section, index) => <View key={index} style={{ marginBottom: 14, borderWidth: 1, borderColor: ASTRO.border, borderRadius: 10, overflow: "hidden", backgroundColor: ASTRO.card }}>
    {/* Keep the heading and first item together, but allow long sections to paginate. */}
    <View wrap={false}>
      <ColumnHeader title={(section.title || model.title || "ITEMS").toUpperCase()} astro />
      {section.items[0] && <TableRow item={section.items[0]} astro />}
    </View>
    {section.items.slice(1).map((item, n) => <TableRow key={n} item={item} astro />)}
  </View>)}</View>;
  return <View>
    {model.sections.map((section, index) => <View key={index}>
      <View wrap={false}>
        {index === 0 && (minimal ? <View style={[s.head, { borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5" }]}><Text style={{ width: "58%" }}>ITEM</Text><Text style={{ width: "7%", textAlign: "right" }}>QTY</Text><Text style={{ width: "17%", textAlign: "right" }}>RATE</Text><Text style={{ width: "18%", textAlign: "right" }}>AMOUNT</Text></View> : <ColumnHeader title="Item" />)}
        {section.title && <Text style={{ padding: 8, paddingTop: 12, fontWeight: 600, fontSize: 9 }}>{section.title}</Text>}
        {section.items[0] && <TableRow item={section.items[0]} />}
      </View>
      {section.items.slice(1).map((item, n) => <TableRow key={n} item={item} />)}
    </View>)}
  </View>;
}

export function SectionHeading({ title, colour }: { title: string; colour: string }) {
  return <View minPresenceAhead={30} style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12, marginBottom: 10 }}>
    <Text style={{ color: colour, fontSize: 9.6, fontWeight: 500, letterSpacing: 1 }}>{title.toUpperCase()}</Text>
    <View style={{ flexGrow: 1, height: 0.7, backgroundColor: colour }} />
  </View>;
}

export function ItemCards({ model, astro = false }: { model: PdfDocument; astro?: boolean }) {
  return <View>{model.sections.map((section, n) => <View key={n}>
    {section.items.map((item, i) => <View key={i} wrap={false}>
      {i === 0 && section.title && <SectionHeading title={section.title} colour={astro ? ASTRO.gold : model.brand.accent} />}
      <View style={{ padding: 9, marginBottom: 8, borderWidth: 1, borderColor: astro ? ASTRO.border : "#e5e5e5", borderRadius: 10, backgroundColor: astro ? ASTRO.card : "#f8f8f8" }}>
        <View style={s.row}>
          <Text style={{ width: "65%", fontSize: 9.6, fontWeight: 600, letterSpacing: 0.5 }}>{item.title.toUpperCase()}</Text>
          <Text style={{ width: "34%", textAlign: "right", fontSize: 8.5, color: astro ? ASTRO.muted : "#737373" }}>{item.quantity} x {item.unitPrice}</Text>
        </View>
        <View style={[s.row, { marginTop: 7, alignItems: "flex-end" }]}>
          <Text style={{ width: "75%", color: astro ? ASTRO.muted : "#737373", fontSize: 9.2, lineHeight: 1.3 }}>{item.description || " "}</Text>
          <Text style={{ width: "25%", paddingLeft: 7, fontSize: astro ? 14.5 : 13, lineHeight: 1.2, fontWeight: 600, textAlign: "right" }}>{item.lineTotal}</Text>
        </View>
      </View>
    </View>)}
  </View>)}</View>;
}

export function Totals({ model, variant = "classic" }: { model: PdfDocument; variant?: "classic" | "minimal" | "bold" | "astro" }) {
  const astro = variant === "astro";
  const receipt = model.type === "receipt";
  const rows: [string, string][] = [["Subtotal", model.subtotal], [`VAT${model.vatMode === "none" ? "" : ` (${model.vatRate}, ${model.vatMode})`}`, model.vat]];
  const showBreakdown = !astro || model.vatMode !== "none";
  return <View wrap={false} style={{ width: astro ? "100%" : "65%", alignSelf: "flex-end", marginTop: 10, marginBottom: 6 }}>
    {showBreakdown && <View style={{ width: astro ? "58%" : "100%", alignSelf: "flex-end", paddingHorizontal: 10 }}>
      {rows.map(([label, value]) => <View key={label} style={[s.row, { marginBottom: 5, fontSize: 8.5, color: astro ? ASTRO.muted : "#737373" }]}><Text>{label}</Text><Text>{value}</Text></View>)}
      {receipt && <View style={[s.row, { marginBottom: 7, fontSize: 9 }]}><Text>Invoice total</Text><Text>{model.total}</Text></View>}
    </View>}
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      {astro && receipt && <View style={{ width: "39%", height: 85, justifyContent: "center", alignItems: "center" }}>
        <View style={{ transform: "rotate(-15deg)", borderWidth: 2, borderColor: ASTRO.red, padding: 3 }}>
          <View style={{ borderWidth: 1, borderColor: ASTRO.red, paddingHorizontal: 20, paddingVertical: 3 }}><Text style={{ fontFamily: "Poppins", color: ASTRO.red, fontWeight: 700, letterSpacing: 4, fontSize: 30, lineHeight: 1.2}}>PAID</Text></View>
        </View>
      </View>}
      <View style={{ flexDirection: "row", marginLeft: "auto", width: astro ? "55%" : "100%", borderWidth: variant === "bold" || astro ? 1 : 0, borderColor: astro ? ASTRO.gold : model.brand.accent, borderRadius: variant === "bold" || astro ? 9 : 0, overflow: "hidden", borderBottomWidth: variant === "minimal" ? 1.5 : variant === "bold" || astro ? 1 : 0, backgroundColor: variant === "classic" ? model.brand.primary : "transparent", color: variant === "classic" ? contrastText(model.brand.primary) : astro ? "#ffffff" : "#202020" }}>
        <Text style={{ width: "50%", padding: 8, backgroundColor: astro ? ASTRO.head : "transparent", fontSize: astro ? 9.6 : 9, color: astro ? ASTRO.muted : undefined, fontWeight: 600, letterSpacing: astro ? 1 : 0 }}>{receipt ? "AMOUNT PAID" : astro && model.type === "quote" ? "TOTAL AMOUNT" : "GRAND TOTAL"}</Text>
        <Text style={{ width: "50%", padding: 8, fontWeight: 600, fontSize: variant === "minimal" ? 16 : astro ? 15.4 : 13, lineHeight: 1.2, textAlign: "right", borderLeftWidth: astro ? 0.7 : 0, borderLeftColor: ASTRO.gold }}>{receipt ? model.amountPaid : model.total}</Text>
      </View>
    </View>
    {(model.type === "invoice" || receipt) && <View style={{ width: astro ? "55%" : "100%", alignSelf: "flex-end", marginTop: 6, paddingHorizontal: 10, fontSize: 8.5 }}>
      {model.type === "invoice" && <View style={[s.row, { marginBottom: 4 }]}><Text>Amount paid</Text><Text>{model.amountPaid}</Text></View>}
      <View style={s.row}><Text>Balance</Text><Text>{model.balance}</Text></View>
    </View>}
  </View>;
}

export function PaymentDetails({ model, astro = false }: { model: PdfDocument; astro?: boolean }) {
  if (!model.bank && !model.mpesa) return null;
  return <View wrap={false} style={[s.row, { marginTop: astro ? 18 : 16, marginBottom: 6 }]}>
    {([{ label: "BANK", rows: model.bank, right: false }, { label: "M-PESA", rows: model.mpesa, right: true }]).map(({ label, rows, right }) => <View key={label} style={{ width: "48%", textAlign: right ? "right" : "left" }}>
      {rows && <><Text style={[s.label, { fontSize: astro ? 11.5 : 8, lineHeight: 1.2, fontWeight: 600, color: astro ? ASTRO.muted : "#737373" }]}>{label}</Text>
        {rows.map((row) => <Text key={row.label} style={{ fontSize: astro ? 10.3 : 9, lineHeight: 1.2, marginBottom: 2 }}><Text style={{ fontWeight: 600 }}>{row.label}: </Text>{row.value}</Text>)}
      </>}
    </View>)}
  </View>;
}

export function Notes({ model, astro = false }: { model: PdfDocument; astro?: boolean }) {
  return <View style={{ marginTop: 12 }}>{[{ label: "Payment terms", text: model.paymentTerms }, { label: "Notes", text: model.notes }, { label: "Terms", text: model.terms }].filter((row) => row.text).map(({ label, text }) => <View key={label} style={{ marginBottom: 9 }}>
    <Text style={[s.label, { color: astro ? ASTRO.muted : "#737373" }]} minPresenceAhead={25}>{label.toUpperCase()}</Text>
    <Text style={{ fontSize: 8.5, color: astro ? ASTRO.muted : "#555555" }}>{text}</Text>
  </View>)}</View>;
}

export function Footer({ model, astro = false }: { model: PdfDocument; astro?: boolean }) {
  const contacts = contactLine(model);
  return <>
    <View fixed style={{ position: "absolute", left: astro ? 0 : 40, right: astro ? 0 : 40, bottom: astro ? 0 : 30, paddingHorizontal: astro ? 36.5 : 0, paddingVertical: astro ? 11 : 0, backgroundColor: astro ? ASTRO.head : "transparent", borderTopWidth: astro ? 0 : 0.5, borderTopColor: "#e5e5e5", fontSize: 7.2, lineHeight: 1.3, color: astro ? "#ffffff" : "#737373", textAlign: "center" }}>
      {model.business.footerText && <Text style={{ fontSize: 7.2, marginBottom: 4, paddingTop: astro ? 0 : 6 }}>{model.business.footerText}</Text>}
      {astro ? <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        {[model.business.phone, model.business.email, model.business.socialHandle].map((text, index) => <Text key={index} style={{ width: "32%", fontSize: 10.3, lineHeight: 1.2, fontWeight: 500, textAlign: index === 0 ? "left" : index === 2 ? "right" : "center" }}>{text || ""}</Text>)}
      </View> : contacts && <Text>{contacts}</Text>}
    </View>
    <Text fixed style={{ position: "absolute", right: astro ? 36.5 : 40, bottom: astro ? footerHeight(model, true) + 10 : 12, fontSize: 7, color: astro ? ASTRO.muted : "#737373" }} render={({ pageNumber, totalPages }) => totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ""} />
  </>;
}
