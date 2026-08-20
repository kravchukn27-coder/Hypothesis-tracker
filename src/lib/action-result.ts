export type ActionResult<T extends object = Record<string, never>> =
  | ({ ok: true; error?: undefined } & T)
  | ({ ok: false; error: string } & Partial<T>);

export function actionSuccess(): ActionResult;
export function actionSuccess<T extends object>(data: T): ActionResult<T>;
export function actionSuccess<T extends object>(data?: T): ActionResult<T> {
  return { ok: true, ...data } as ActionResult<T>;
}

export function actionFailure<T extends object = Record<string, never>>(error: string): ActionResult<T> {
  return { ok: false, error };
}
