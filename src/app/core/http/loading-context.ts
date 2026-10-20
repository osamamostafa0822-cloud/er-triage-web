import { HttpContextToken } from '@angular/common/http';

/** Opt out per request (for example, background polling) without changing HTTP headers. */
export const SKIP_GLOBAL_LOADING = new HttpContextToken<boolean>(() => false);
