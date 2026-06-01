import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function RescueScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/02-ritual.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/" },
        { x: 48, y: 1054, width: 684, height: 96, href: "/today-review?from=rescue" },
        { x: 48, y: 1164, width: 684, height: 92, href: "/shutdown-challenge" },
        { x: 37, y: 1540, width: 135, height: 76, href: "/" },
        { x: 383, y: 1540, width: 135, height: 76, href: "/records" },
        { x: 566, y: 1540, width: 135, height: 76, href: "/settings" }
      ]}
    />
  );
}
