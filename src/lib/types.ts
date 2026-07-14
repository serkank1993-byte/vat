export type Team = {
  id: number;
  name: string;
  founded_date: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  jersey_image_url: string | null;
  logo_url: string | null;
  created_at: string;
};

export type TeamRecord = {
  id: number;
  team_id: number;
  title: string;
  detail: string | null;
  created_at: string;
};

export type TeamAchievement = {
  id: number;
  team_id: number;
  title: string;
  year: number | null;
  created_at: string;
};

export type Player = {
  id: number;
  team_id: number | null;
  name: string;
  jersey_number: number;
  position: string | null;
  user_id: string | null;
  role: "player" | "captain";
  invite_token: string | null;
  photo_url: string | null;
  created_at: string;
};

export type Match = {
  id: number;
  team_id: number | null;
  opponent_name: string;
  match_date: string;
  location: string | null;
  score_for: number | null;
  score_against: number | null;
  status: string | null;
  video_url: string | null;
  created_at: string;
};

export type MatchEvent = {
  id: number;
  match_id: number | null;
  player_id: number | null;
  event_type: string;
  minute: number;
  second: number | null;
  description: string | null;
  zone: number | null;
  created_at: string;
};

export type AttendanceStatus = "geliyor" | "gelmiyor" | "belirsiz";

export type MatchAttendance = {
  id: number;
  match_id: number | null;
  player_id: number | null;
  status: AttendanceStatus;
  responded_at: string | null;
  created_at: string;
};

export type TacticsContext = "starting" | "set_piece_attack" | "set_piece_defense";

export type MatchFormation = {
  match_id: number;
  formation: string;
  updated_at: string;
};

export type MatchTacticPosition = {
  id: number;
  match_id: number;
  context: TacticsContext;
  player_id: number;
  pos_x: number;
  pos_y: number;
  created_at: string;
};
