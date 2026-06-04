import { router } from "expo-router";
import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";
import { markReadyToSleep, markSleepGeneratorUsed } from "@/storage/rescueSessionStorage";
import {
  markReadyToSleep as markExecutionReadyToSleep,
  markSleepAidStarted
} from "@/storage/dailyExecutionStorage";

export default function BedtimeScreen() {
  const chooseSound = async (choice: string) => {
    await markSleepGeneratorUsed(choice);
    await markSleepAidStarted({ aid: "sound_spa" });
  };

  const readyToSleep = async () => {
    await markReadyToSleep();
    await markExecutionReadyToSleep();
    router.replace("/rescue");
  };

  return (
    <PrototypeScreen
      source={require("../assets/prototypes/05-sound-spa.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/sleep-generator" },
        { x: 48, y: 1170, width: 316, height: 190, onPress: () => chooseSound("夜雨") },
        { x: 394, y: 1170, width: 316, height: 190, onPress: () => chooseSound("海浪") },
        { x: 48, y: 1390, width: 316, height: 190, onPress: () => chooseSound("风声") },
        { x: 394, y: 1390, width: 316, height: 190, onPress: () => chooseSound("低频白噪音") },
        { x: 48, y: 1510, width: 684, height: 92, onPress: readyToSleep }
      ]}
    />
  );
}
