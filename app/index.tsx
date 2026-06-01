import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function HomeScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/01-home.png")}
      hotspots={[
        { x: 604, y: 65, width: 96, height: 66, href: "/settings" },
        { x: 48, y: 626, width: 310, height: 94, href: "/rescue" },
        { x: 44, y: 1072, width: 313, height: 155, href: "/bedtime" },
        { x: 382, y: 1072, width: 313, height: 155, href: "/shutdown-challenge" },
        { x: 199, y: 1540, width: 135, height: 76, href: "/rescue" },
        { x: 383, y: 1540, width: 135, height: 76, href: "/records" },
        { x: 566, y: 1540, width: 135, height: 76, href: "/settings" }
      ]}
    />
  );
}
