import { FileCode2, FileImage, FileText, FileVideo, File } from "lucide-react";

export function PageIcon({ kind, className = "size-5" }: { kind: string; className?: string }) {
  const Icon = { html: FileCode2, image: FileImage, pdf: FileText, video: FileVideo, office: File }[kind] ?? File;
  return <Icon className={className} aria-hidden="true" />;
}
