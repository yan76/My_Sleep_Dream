import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function SleepGeneratorScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/04-generator.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/rescue" },
        { x: 48, y: 612, width: 316, height: 191, href: "/bedtime" },
        { x: 394, y: 612, width: 316, height: 191, href: "/tree-hole" },
        { x: 48, y: 836, width: 316, height: 191, href: "/bedtime" },
        { x: 394, y: 836, width: 316, height: 191, href: "/bedtime" },
        { x: 48, y: 1154, width: 684, height: 96, href: "/bedtime" },
        { x: 48, y: 1268, width: 684, height: 92, href: "/" }
      ]}
    />
  );
}
