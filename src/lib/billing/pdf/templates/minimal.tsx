import { Document, Text, View } from "@react-pdf/renderer";
import type { PdfDocument } from "../model";
import { BillTo, Business, documentLabel, ItemsTable, Metadata, Notes, PaymentDetails, PdfPage, Totals } from "./parts";

export function MinimalTemplate({ model }: { model: PdfDocument }) {
  return <Document title={`${model.number} ${documentLabel(model)}`} author={model.business.name}>
    <PdfPage model={model}>
      <Business model={model} />
      <View style={{ marginTop: 16, marginBottom: 16, borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5", paddingBottom: 10 }}>
        <Text style={{ fontSize: 9, color: "#737373", letterSpacing: 2 }}>{documentLabel(model)}</Text><Text style={{ fontSize: 24, lineHeight: 1.2, marginTop: 4 }}>{model.number}</Text>{model.title && <Text style={{ marginTop: 8, fontSize: 11, lineHeight: 1.2}}>{model.title}</Text>}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 22 }}><BillTo model={model} /><Metadata model={model} hideNumber /></View>
      <ItemsTable model={model} minimal /><Totals model={model} variant="minimal" /><PaymentDetails model={model} /><Notes model={model} />
    </PdfPage>
  </Document>;
}
