import * as React from "react";
import * as PropTypes from "prop-types";
import * as invariant from "invariant";

import {
  RosaClient,
  Query,
  QueryDefinition,
  ActionDefinition
} from "rosa-client";
import { MapQueriesToProps } from "../types/queries";
import { MapActionsToProps } from "../types/actions";
import { ConnectOptions } from "../types/connect";
import { diffObjects } from "../utils/diff-objects";

let hotReloadingVersion = 0;

export interface InjectedProps {
  [key: string]: any;
}

export interface ExternalProps {
  [key: string]: any;
}

export interface State {
  [key: string]: any;
}

class ConnectBase<P = {}, S = {}> extends React.Component<P, S> {}

export function connect(
  mapQueriesToProps: MapQueriesToProps | null = null,
  mapActionsToProps: MapActionsToProps | null = null,
  {
    getDisplayName = (name: string) => `rosa(${name})`,
    // the key of props/context to get the store
    storeKey = "store",
    debug = false,
    ...extraOptions
  }: ConnectOptions = {}
) {
  return connectAdvanced({
    mapQueriesToProps,
    mapActionsToProps,
    getDisplayName,
    storeKey,
    ...extraOptions
  });
}

export const connectAdvanced = ({
  debug = false,
  storeKey = "store",
  mapQueriesToProps,
  mapActionsToProps
}: ConnectOptions = {}) => <TOriginalProps extends {}>(
  WrappedComponent:
    | React.ComponentClass<TOriginalProps & InjectedProps>
    | React.StatelessComponent<TOriginalProps & InjectedProps>
) => {
  // body
  type ResultProps = TOriginalProps & ExternalProps;
  const version = hotReloadingVersion++;
  console.log(
    "connect",
    `Rosa(${WrappedComponent.displayName || WrappedComponent.name})`
  );
  const result = class Connect extends ConnectBase<ResultProps, State> {
    //- Static variables
    static contextTypes = {
      [storeKey]: PropTypes.instanceOf(RosaClient).isRequired
    };
    static displayName = `Rosa(${WrappedComponent.displayName})`;

    queryMap: {} = {};

    version: number = 0;
    renderCount: number = 0;
    store: RosaClient;

    queriesByPropKey: {
      [key: string]: {
        handle: string;
        unsubscribe?: () => void;
      };
    } = Object.create(null);

    propKeysByQueryIds: {
      [key: string]: string;
    } = Object.create(null);

    /**
     * TODO: ???
     * Creates a new subscription for `QueryDefinition`.
     * The `WrappedComponent` will get the product of that under props.`key`.
     */
    subscribePropKey(key: string, QueryDefinition: QueryDefinition) {
      const query = this.store.query(
        QueryDefinition.name,
        QueryDefinition.params
      );
      // if (err) {
      //   console.log("subscribePropKey error", err);
      //   throw new Error(err);
      // }
      const queryId = query.id;
      this.propKeysByQueryIds[queryId] = key;
      this.queriesByPropKey[key] = {
        handle: queryId
      };
      this.queriesByPropKey[key].unsubscribe = query.subscribe(
        this.onQueryUpdated
      );
    }

    /**
     * TODO: ???
     * Ubsubscribe an existing definition belonging to `key`.
     */
    unsubscribePropKey(key: string) {
      const { unsubscribe, handle } = this.queriesByPropKey[key];
      delete this.queriesByPropKey[key];
      delete this.propKeysByQueryIds[handle];
      this.setState({
        [key]: null
      });
      unsubscribe();
    }

    /**
     * Translates `props` to subscription definitions using `MapQueriesToProps`.
     */
    getQueryMap(props: any): { [key: string]: any } {
      // Make sure the function mapQueriesToProps has been passed.
      if (typeof mapQueriesToProps !== "function") {
        return {};
      }

      // Use it and make sure it returns an Object.
      const queryMap = mapQueriesToProps(props);
      invariant(
        typeof queryMap === "object",
        `mapQueriesToProps must return an Object`
      );

      // Iterate the result object and resolve any functions to QueryDefinitions
      for (let key in queryMap) {
        const item = queryMap[key];

        // Try to resolve any functions
        if (typeof item === "function") {
          try {
            queryMap[key] = item(props);
          } catch (error) {
            console.log(error);
          }
        }
      }
      return queryMap;
    }

    /**
     * Translates props to callable actions using mapActionsToProps().
     */
    getActionMap(props: {
      [key: string]: any;
    }): { [key: string]: (...args: any[]) => void } {
      // Make sure the function mapActionsToProps has been passed.
      if (typeof mapActionsToProps !== "function") {
        return {};
      }

      // Use it and make sure it returns an Object.
      const actionsMap = mapActionsToProps(props);
      invariant(
        typeof actionsMap === "object",
        `mapActionsToProps must return an Object`
      );

      // Iterate the result object
      // and prepare it to be used from the WrappedComponent.
      const result = {};
      for (let key in actionsMap) {
        const action = actionsMap[key];
        if (typeof action === "object") {
          result[key] = this.store.exec.bind(
            this.store,
            action.name,
            action.params,
            () => {
              console.log("action successful object");
            }
          );
        } else if (typeof action === "function") {
          result[key] = (...args: any[]) => {
            const result: ActionDefinition = action(...args);
            this.store.exec(result.name, result.params, () => {
              console.log("action successful function");
            });
          };
        }
      }
      return result;
    }

    maintainQueries(newProps: {}) {
      // compare old with new, apply differences
      const newQueryMap = this.getQueryMap(newProps);

      // calculate what changes have been made to the subscriptions
      const { added, deleted, changed } = diffObjects(
        this.queryMap,
        newQueryMap
      );

      // and remember it for the next time
      this.queryMap = newQueryMap;

      // update changed subscriptions
      changed.forEach(key => {
        // remove old
        this.unsubscribePropKey(key);

        // add new
        const queryDefinition = newQueryMap[key];
        this.subscribePropKey(key, queryDefinition);
      });

      // subscribe to new ones
      added.forEach(key => {
        const queryDefinition = newQueryMap[key];
        this.subscribePropKey(key, queryDefinition);
      });

      // unsubscribe old ones
      deleted.forEach(key => {
        this.unsubscribePropKey(key);
      });
    }

    maintainActions(newProps: {}) {
      const actions = this.getActionMap(newProps);
      this.setState({
        actions
      });
    }

    /**
     * Callback called by `rosa-client` when a subscription updates.
     */
    onQueryUpdated(query: Query) {
      const propKey = this.propKeysByQueryIds[query.id];
      if (propKey !== undefined) {
        this.setState({
          [propKey]: query.data
        });
      }
    }

    constructor(props: ResultProps, context: any) {
      super(props, context);

      this.version = version;
      this.renderCount = 0;
      this.store = props[storeKey] || context[storeKey];

      // invariant(
      //   this.store,
      //   `Could not find "${storeKey}" in either the context or props of ` +
      //     `"${displayName}". Either wrap the root component in a <Provider>, ` +
      //     `or explicitly pass "${storeKey}" as a prop to "${displayName}".`
      // );

      this.onQueryUpdated = this.onQueryUpdated.bind(this);

      this.queriesByPropKey = {};
      this.propKeysByQueryIds = {};

      this.state = {};
    }

    componentWillUnmount() {
      this.store.unwatchAll(this.onQueryUpdated);
      this.queriesByPropKey = {};
      this.propKeysByQueryIds = {};
      this.store = null;
    }

    componentWillMount() {
      this.maintainQueries(this.props);
      this.maintainActions(this.props);
    }

    componentWillReceiveProps(nextProps: {}) {
      this.maintainQueries(nextProps);
      this.maintainActions(nextProps);
    }

    render() {
      return <WrappedComponent {...this.props} {...this.state} />;
    }
  };

  return result;
};
