import { router } from "expo-router";
import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";
import { markReadyToSleep, markTreeHoleUsed } from "@/storage/rescueSessionStorage";
import {
  markReadyToSleep as markExecutionReadyToSleep,
  markSleepAidStarted
} from "@/storage/dailyExecutionStorage";

export default function TreeHoleScreen() {
  const generateGoodNightHint = async () => {
    await markTreeHoleUsed();
    await markSleepAidStarted({ aid: "tree_hole" });
  };

  const readyToSleep = async () => {
    await markTreeHoleUsed();
    await markSleepAidStarted({ aid: "tree_hole" });
    await markReadyToSleep();
    await markExecutionReadyToSleep();
    router.replace("/rescue");
  };

  return (
    <PrototypeScreen
      source={require("../assets/prototypes/06-tree-hole.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/sleep-generator" },
        { x: 48, y: 1400, width: 684, height: 96, onPress: generateGoodNightHint },
        { x: 48, y: 1510, width: 684, height: 92, onPress: readyToSleep }
      ]}
    />
  );
}
