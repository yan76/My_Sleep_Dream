import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function TreeHoleScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/06-tree-hole.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/sleep-generator" },
        { x: 48, y: 1400, width: 684, height: 96, href: "/tree-hole" },
        { x: 48, y: 1510, width: 684, height: 92, href: "/" }
      ]}
    />
  );
}
