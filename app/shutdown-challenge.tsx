import { router } from "expo-router";
import { PrototypeScreen } from "@/components/prototype/PrototypeScreen";
import { markShutdownChallengeCompleted } from "@/storage/rescueSessionStorage";
import { markDailyShutdownChallengeCompleted } from "@/storage/dailyExecutionStorage";

export default function ShutdownChallengeScreen() {
  const completeChallenge = async () => {
    await markShutdownChallengeCompleted();
    await markDailyShutdownChallengeCompleted();
    router.replace("/rescue");
  };

  return (
    <PrototypeScreen
      source={require("../assets/prototypes/07-shutdown.png")}
      hotspots={[
        { x: 45, y: 65, width: 100, height: 72, href: "/rescue" },
        { x: 548, y: 65, width: 178, height: 72, href: "/sleep-generator" },
        { x: 48, y: 1400, width: 684, height: 96, onPress: completeChallenge },
        { x: 48, y: 1510, width: 684, height: 92, href: "/shutdown-challenge" }
      ]}
    />
  );
}
