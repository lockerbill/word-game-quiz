export type UserRole = 'player' | 'moderator' | 'admin' | 'super_admin';

export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface AdminSession {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    isGuest: boolean;
    role: UserRole;
    accountStatus: AccountStatus;
    avatar: string;
    level: number;
    xp: number;
    gamesPlayed: number;
    bestScore: number;
  };
}
