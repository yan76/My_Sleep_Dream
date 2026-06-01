import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function CheckinScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/08-checkin.png")}
      hotspots={[
        { x: 620, y: 65, width: 100, height: 72, href: "/" },
        { x: 48, y: 1510, width: 684, height: 96, href: "/review" }
      ]}
    />
  );
}
