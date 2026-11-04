import { Document, Text, View } from "@react-pdf/renderer";
import type { PdfDocument } from "../model";
import { BillTo, Business, documentLabel, ItemsTable, Metadata, Notes, PaymentDetails, PdfPage, Totals } from "./parts";

export function ClassicTemplate({ model }: { model: PdfDocument }) {
  return <Document title={`${model.number} ${documentLabel(model)}`} author={model.business.name}>
    <PdfPage model={model}>
      <View fixed style={{ position: "absolute", top: 0, left: 0, right: 0, height: 7, backgroundColor: model.brand.primary }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
        <Business model={model} />
        <View style={{ width: "52%", textAlign: "right" }}><Text style={{ fontSize: 28, lineHeight: 1.2, fontWeight: 600 }}>{documentLabel(model)}</Text><Text style={{ fontSize: 12, lineHeight: 1.2, marginTop: 5 }}>{model.number}</Text>{model.title && <Text style={{ marginTop: 7, fontSize: 10, lineHeight: 1.2}}>{model.title}</Text>}</View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}><BillTo model={model} /><Metadata model={model} /></View>
      <ItemsTable model={model} /><Totals model={model} /><PaymentDetails model={model} /><Notes model={model} />
    </PdfPage>
  </Document>;
}
