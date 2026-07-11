export const ZONES: { value: number; label: string }[] = [
  { value: 1, label: "Def Left" },
  { value: 2, label: "Def Center" },
  { value: 3, label: "Def Right" },
  { value: 4, label: "Mid Left" },
  { value: 5, label: "Mid Center" },
  { value: 6, label: "Mid Right" },
  { value: 7, label: "Att Left" },
  { value: 8, label: "Att Center" },
  { value: 9, label: "Att Right" },
];

export const EVENT_TYPES: { key: string; label: string }[] = [
  { key: "goal", label: "Goal" },
  { key: "assist", label: "Assist" },
  { key: "shot", label: "Shot" },
  { key: "shot_on_target", label: "Shot on Target" },
  { key: "pass", label: "Pass" },
  { key: "successful_pass", label: "Successful Pass" },
  { key: "dribble", label: "Dribble" },
  { key: "tackle", label: "Tackle" },
  { key: "foul", label: "Foul" },
  { key: "yellow_card", label: "Yellow Card" },
  { key: "red_card", label: "Red Card" },
];

export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
