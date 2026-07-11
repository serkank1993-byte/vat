export type Team = {
  id: number;
  name: string;
  created_at: string;
};

export type Player = {
  id: number;
  team_id: number | null;
  name: string;
  jersey_number: number;
  position: string | null;
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
  created_at: string;
};

export type MatchStat = {
  id: number;
  match_id: number | null;
  player_id: number | null;
  passes: number | null;
  successful_passes: number | null;
  shots: number | null;
  shots_on_target: number | null;
  dribbles: number | null;
  tackles: number | null;
  fouls: number | null;
  cards: string | null;
  assists: number | null;
  goals: number | null;
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
