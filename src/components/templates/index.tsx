import { ImageLed } from "./image-led";
import { TypeLed } from "./type-led";
import { Minimal } from "./minimal";
import { Birthday } from "./birthday";
import { Conference } from "./conference";
import type { EventTemplateProps } from "./shared";

export function renderTemplate(template: string, props: EventTemplateProps) {
  switch (template) {
    case "image-led":
      return <ImageLed {...props} />;
    case "type-led":
      return <TypeLed {...props} />;
    case "minimal":
      return <Minimal {...props} />;
    case "birthday":
      return <Birthday {...props} />;
    case "conference":
      return <Conference {...props} />;
    default:
      return <ImageLed {...props} />;
  }
}
