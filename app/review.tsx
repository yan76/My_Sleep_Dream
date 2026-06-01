import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function ReviewScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/09-feedback.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/" },
        { x: 620, y: 65, width: 100, height: 72, href: "/checkin" },
        { x: 48, y: 1510, width: 684, height: 96, href: "/records" }
      ]}
    />
  );
}
