import React, {Component} from 'react';

/**
 * @param {{Component}} WrappedComponent
 * @param storeKey
 * @return {{Component}}
 */
export default function (WrappedComponent, storeKey = "store") {

	return class extends React.Component {
		constructor(props) {
			super(props);
		}

		render() {
			const props = {
				[storeKey]: {
					subscribe: this.subscribe.bind(this),
					unsubscribe: this.unsubscribe.bind(this),
				},
			};
			return (
				<WrappedComponent
					{...this.props}
					{...props}
				/>
			)
		}

		componentDidMount() {
			// todo subscribe
		}

		componentWillUnmount() {
			// todo unsubscribe all
		}

		subscriptionUpdated() {
			this.forceUpdate();
		}
	}
}
