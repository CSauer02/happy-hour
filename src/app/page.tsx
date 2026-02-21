import { getVenues } from "@/lib/venues";
import HappyHourApp from "@/components/HappyHourApp";

export default async function Home() {
  const venues = await getVenues();

  return <HappyHourApp initialVenues={venues} />;
}
