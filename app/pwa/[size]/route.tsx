import { ImageResponse } from "next/og";
import { AppIcon } from "../../app-icon";

// Android için 192 ve 512 piksel ikonlar (manifest'te kullanılır)
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  return new ImageResponse(<AppIcon size={size} />, { width: size, height: size });
}
