export type SessionPayload = {
  sub: string;
  exp: number;
  sv: number;
  sid: string;
};

export type SessionUser = {
  id: string;
  name: string;
};
