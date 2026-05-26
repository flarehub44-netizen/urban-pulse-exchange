import { Component, type ReactNode } from "react";
import { InlineErrorState } from "@/components/viax/inline-error-state";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[RouteErrorBoundary]", error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <InlineErrorState message={this.state.error.message} onRetry={this.reset} />
        )
      );
    }
    return this.props.children;
  }
}
