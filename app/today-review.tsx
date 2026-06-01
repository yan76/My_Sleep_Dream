import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function TodayReviewScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/03-review-today.png")}
      hotspots={[
        { x: 45, y: 65, width: 110, height: 72, href: "/rescue" },
        { x: 48, y: 1158, width: 684, height: 96, href: "/sleep-generator" },
        { x: 48, y: 1270, width: 684, height: 92, href: "/sleep-generator" }
      ]}
    />
  );
}
