import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function RecordsScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/10-growth.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/review" },
        { x: 48, y: 1400, width: 684, height: 96, href: "/weekly-summary" },
        { x: 37, y: 1540, width: 135, height: 76, href: "/" },
        { x: 199, y: 1540, width: 135, height: 76, href: "/rescue" },
        { x: 566, y: 1540, width: 135, height: 76, href: "/settings" }
      ]}
    />
  );
}
