import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function WeeklySummaryScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/11-weekly.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/records" },
        { x: 48, y: 1510, width: 684, height: 96, href: "/records" }
      ]}
    />
  );
}
