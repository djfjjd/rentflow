import { isDeveloperLoginEnabled } from "../../../lib/permissions";

type Env = {
  DB: any;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return Response.json({
      accounts: {
        developer: await isDeveloperLoginEnabled(env.DB),
        admin: true,
        manager: true,
        staff: true,
      },
    });
  } catch (error) {
    console.error("auth options api failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({
      accounts: {
        developer: true,
        admin: true,
        manager: true,
        staff: true,
      },
    });
  }
};
