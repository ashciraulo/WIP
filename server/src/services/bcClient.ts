import fixture from "./bcFixture.json";

export interface BCJob {
  bcJobId: string;
  jobNumber: string;
  name: string;
  client: string | null;
  dueDate: string | null; // ISO date
}

/**
 * Business Central integration point.
 *
 * Real implementation (not wired up yet — needs a BC tenant + app
 * registration to test against):
 *
 *   1. OAuth2 client-credentials grant against
 *      https://login.microsoftonline.com/{BC_TENANT_ID}/oauth2/v2.0/token
 *      scope: https://api.businesscentral.dynamics.com/.default
 *   2. GET https://api.businesscentral.dynamics.com/v2.0/{BC_ENVIRONMENT}/api/v2.0/companies({BC_COMPANY_ID})/jobs
 *      (or the equivalent custom API page if the standard Jobs entity
 *      doesn't expose what we need — e.g. a filtered view of open jobs only)
 *   3. Map the BC job payload fields to BCJob below.
 *
 * Until BC credentials are configured, this reads a local fixture so the
 * rest of the app (import flow, dedupe-by-bcJobId, task creation) can be
 * built and demoed against realistic data.
 */
export async function fetchJobsFromBC(): Promise<BCJob[]> {
  const configured = process.env.BC_TENANT_ID && process.env.BC_CLIENT_ID && process.env.BC_CLIENT_SECRET;

  if (!configured) {
    return fixture as BCJob[];
  }

  // TODO: replace with a real call once BC credentials are available.
  // const token = await getBCAccessToken();
  // const res = await fetch(`https://api.businesscentral.dynamics.com/v2.0/${process.env.BC_ENVIRONMENT}/api/v2.0/companies(${process.env.BC_COMPANY_ID})/jobs`, {
  //   headers: { Authorization: `Bearer ${token}` },
  // });
  // const data = await res.json();
  // return data.value.map(mapBCJob);
  throw new Error("BC credentials are set but the live BC client isn't implemented yet — see comments in bcClient.ts");
}
