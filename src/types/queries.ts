import { QueryDefinition } from "rosa-client";

export type QueryFunction = (...args: any[]) => QueryDefinition;

export type MapQueriesToProps = (
  props: {}
) => { [key: string]: QueryDefinition | QueryFunction };
