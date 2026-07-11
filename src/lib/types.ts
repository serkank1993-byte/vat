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
