export const ZONES: { value: number; label: string }[] = [
  { value: 1, label: "Def Sol" },
  { value: 2, label: "Def Orta" },
  { value: 3, label: "Def Sağ" },
  { value: 4, label: "Orta Sol" },
  { value: 5, label: "Orta Merkez" },
  { value: 6, label: "Orta Sağ" },
  { value: 7, label: "Hüc Sol" },
  { value: 8, label: "Hüc Orta" },
  { value: 9, label: "Hüc Sağ" },
];

export const EVENT_TYPES: { key: string; label: string }[] = [
  { key: "goal", label: "Gol" },
  { key: "assist", label: "Asist" },
  { key: "shot", label: "Şut" },
  { key: "shot_on_target", label: "İsabetli Şut" },
  { key: "pass", label: "Pas" },
  { key: "successful_pass", label: "İsabetli Pas" },
  { key: "dribble", label: "Çalım" },
  { key: "tackle", label: "Müdahale" },
  { key: "foul", label: "Faul" },
  { key: "yellow_card", label: "Sarı Kart" },
  { key: "red_card", label: "Kırmızı Kart" },
];

export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
