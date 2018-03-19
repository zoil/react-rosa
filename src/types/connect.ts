import { MapQueriesToProps } from "./queries";
import { MapActionsToProps } from "./actions";

export interface ConnectOptions {
  debug?: boolean;
  MapQueriesToProps?: MapQueriesToProps;
  mapActionsToProps?: MapActionsToProps;
  [key: string]: any;
}
