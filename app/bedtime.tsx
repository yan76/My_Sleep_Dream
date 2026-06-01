import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";

export default function BedtimeScreen() {
  return (
    <PrototypeScreen
      source={require("../assets/prototypes/05-sound-spa.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/sleep-generator" },
        { x: 48, y: 1170, width: 316, height: 190, href: "/bedtime" },
        { x: 394, y: 1170, width: 316, height: 190, href: "/bedtime" },
        { x: 48, y: 1390, width: 316, height: 190, href: "/bedtime" },
        { x: 394, y: 1390, width: 316, height: 190, href: "/bedtime" }
      ]}
    />
  );
}
