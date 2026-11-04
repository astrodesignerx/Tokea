import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerBillingFonts() {
  if (registered) return;
  const source = (file: string) => path.join(process.cwd(), "src/assets/billing-fonts", file);
  Font.register({ family: "Poppins", fonts: [
    { src: source("Poppins-Regular.ttf"), fontWeight: 400 },
    { src: source("Poppins-Medium.ttf"), fontWeight: 500 },
    { src: source("Poppins-SemiBold.ttf"), fontWeight: 600 },
    { src: source("Poppins-Bold.ttf"), fontWeight: 700 },
  ] });
  Font.register({ family: "Inter", fonts: [400, 500, 600, 700].map((fontWeight) => ({
    src: source(`Inter-${fontWeight}.ttf`), fontWeight,
  })) });
  Font.register({ family: "Young Serif", src: source("YoungSerif-Regular.ttf"), fontWeight: 400 });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
