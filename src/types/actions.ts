import { ActionDefinition } from "rosa-client";

export type ActionFunction = (...args: any[]) => ActionDefinition;

export type MapActionsToProps = (
  props: { [key: string]: any }
) => { [key: string]: ActionDefinition | ActionFunction };
