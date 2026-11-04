import { Document, Text, View } from "@react-pdf/renderer";
import type { PdfDocument } from "../model";
import { BillTo, Business, contrastText, documentLabel, ItemCards, Metadata, Notes, PaymentDetails, PdfPage, Totals } from "./parts";

export function BoldTemplate({ model }: { model: PdfDocument }) {
  const ink = contrastText(model.brand.primary);
  return <Document title={`${model.number} ${documentLabel(model)}`} author={model.business.name}>
    <PdfPage model={model}>
      <View style={{ marginTop: -40, marginLeft: -40, marginRight: -40, paddingHorizontal: 40, paddingTop: 30, paddingBottom: 20, marginBottom: -4, backgroundColor: model.brand.primary, color: ink }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Business model={model} colour={ink} />
          <View style={{ width: "52%", textAlign: "right" }}><Text style={{ fontSize: 27, lineHeight: 1.2, fontWeight: 700 }}>{documentLabel(model)}</Text><Text style={{ fontSize: 13, lineHeight: 1.2, marginTop: 5 }}>{model.number}</Text>{model.title && <Text style={{ fontSize: 10, lineHeight: 1.2, marginTop: 8 }}>{model.title}</Text>}</View>
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20, marginBottom: 12 }}><BillTo model={model} /><Metadata model={model} /></View>
      <ItemCards model={model} /><Totals model={model} variant="bold" /><PaymentDetails model={model} /><Notes model={model} />
    </PdfPage>
  </Document>;
}
