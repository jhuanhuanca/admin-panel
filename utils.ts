import { createDefine } from "fresh";
import type { StaffProfile } from "./lib/api/client.ts";

export interface State {
  token: string | null;
  staff: StaffProfile | null;
}

export const define = createDefine<State>();
