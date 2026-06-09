/** Barrel re-export — admin hooks split under `./admin/`. */
export {
  getAdminRpcErrorMessage,
  isAdminRpcForbiddenError,
  isCpaRiskRpcMissingError,
} from "@/lib/admin-rpc-errors";

export * from "./admin";
