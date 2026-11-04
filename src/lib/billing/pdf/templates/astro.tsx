import { Document, Text, View } from "@react-pdf/renderer";
import type { PdfDocument } from "../model";
import { ASTRO, BillTo, Business, documentLabel, ItemCards, ItemsTable, Metadata, Notes, PaymentDetails, PdfPage, SectionHeading, Totals } from "./parts";

export function AstroTemplate({ model }: { model: PdfDocument }) {
  const quote = model.type === "quote";
  return <Document title={`${model.number} ${documentLabel(model)}`} author={model.business.name}>
    <PdfPage model={model} astro>
      <View style={{ minHeight: 118, position: "relative" }}>
        <Business model={model} astro />
        <View style={{ position: "absolute", top: 0, right: 0, width: 420, textAlign: "right" }}>
          <Text style={{ fontFamily: "Young Serif", fontWeight: 400, fontSize: 49.7, letterSpacing: 1.98, lineHeight: 1.1 }}>{documentLabel(model)}</Text>
          {model.title && <Text style={{ color: ASTRO.muted, fontSize: 11.9, lineHeight: 1.2, fontWeight: 600, marginTop: 3, marginLeft: 80 }}>{model.title.toUpperCase()}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14, marginBottom: quote ? 18 : 22, minHeight: 70 }}><BillTo model={model} astro /><Metadata model={model} astro /></View>
      {quote ? <ItemCards model={model} astro /> : <ItemsTable model={model} astro />}
      <Totals model={model} variant="astro" />
      {quote ? <>
        {model.terms && <View wrap={false}>
          <SectionHeading title="Terms" colour={ASTRO.gold} />
          <View style={{ backgroundColor: ASTRO.card, borderWidth: 1, borderColor: ASTRO.border, borderRadius: 10, padding: 14 }}><Text style={{ color: ASTRO.muted, fontSize: 9.2 }}>{model.terms}</Text></View>
        </View>}
        {(model.paymentTerms || model.notes) && <View style={{ marginTop: 24, paddingTop: 18, borderTopWidth: 0.7, borderTopColor: ASTRO.gold }}>
          {model.paymentTerms && <Text style={{ textAlign: "center", color: ASTRO.muted, fontSize: 8.5, marginBottom: 7 }}><Text style={{ color: ASTRO.gold }}>Payment: </Text>{model.paymentTerms}</Text>}
          {model.notes && <Text style={{ textAlign: "center", color: ASTRO.muted, fontSize: 8.5 }}>{model.notes}</Text>}
        </View>}
      </> : <>
        <PaymentDetails model={model} astro /><Notes model={model} astro />
      </>}
    </PdfPage>
  </Document>;
}
