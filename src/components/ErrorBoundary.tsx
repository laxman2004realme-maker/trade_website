import React from 'react';

type State = { hasError: boolean; error?: Error | null };

export default class ErrorBoundary extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: any) {
        // You could log this to an external service
        // eslint-disable-next-line no-console
        console.error('ErrorBoundary caught error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 24, background: '#fee2e2', borderRadius: 8 }}>
                    <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
                    <p>{this.state.error?.message ?? 'An unexpected error occurred.'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: '8px 12px', borderRadius: 6, background: '#7c3aed', color: 'white', border: 'none' }}
                    >
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
