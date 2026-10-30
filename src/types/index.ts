export interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
}

export interface TMDBMovieDetail extends TMDBMovie {
  genres: { id: number; name: string }[];
  credits?: {
    cast: { id: number; name: string; character: string; order: number }[];
    crew: { id: number; name: string; job: string; department: string }[];
  };
  runtime: number;
}

export interface Movie {
  id: number; // TMDB id
  title: string;
  poster_path: string | null;
  year: number;
  genres: string[];
  overview: string;
  director?: string;
}

export interface UserMovie {
  id: string;
  user_id: string;
  movie_id: number;
  elo_score: number;
  comparisons_count: number;
  added_at: string;
  letterboxd_rating?: number | null;
  movie: Movie;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
  profile?: Profile;
}

export interface Recommendation {
  movie: TMDBMovieDetail;
  score: number;
  reasons: string[];
}
