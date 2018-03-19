import * as React from "react";
import * as PropTypes from "prop-types";
import { RosaClient } from "rosa-client";

export interface Props {
  store: RosaClient;
}

export class Provider extends React.Component<Props> {
  static displayName = "Provider";

  static childContextTypes = {
    store: PropTypes.instanceOf(RosaClient).isRequired
  };

  static propTypes = {
    store: PropTypes.instanceOf(RosaClient).isRequired,
    children: PropTypes.element.isRequired
  };

  getChildContext() {
    return {
      store: this.props.store
    };
  }

  render() {
    return React.Children.only(this.props.children);
  }
}
