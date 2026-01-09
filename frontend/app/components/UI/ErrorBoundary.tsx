'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch and handle React rendering errors.
 * Prevents the entire app from crashing when a component throws an error.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });
        // Log error to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
            // Could integrate with error monitoring like Sentry here
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div
                    style={{
                        padding: '2rem',
                        margin: '2rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        textAlign: 'center',
                    }}
                >
                    <h2
                        style={{
                            color: '#EF4444',
                            marginBottom: '1rem',
                            fontSize: '1.5rem',
                        }}
                    >
                        ⚠️ Something went wrong
                    </h2>
                    <p
                        style={{
                            color: '#94A3B8',
                            marginBottom: '1.5rem',
                        }}
                    >
                        An error occurred while rendering this component.
                    </p>
                    {process.env.NODE_ENV !== 'production' && this.state.error && (
                        <details
                            style={{
                                textAlign: 'left',
                                padding: '1rem',
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: '8px',
                                marginBottom: '1.5rem',
                            }}
                        >
                            <summary
                                style={{
                                    cursor: 'pointer',
                                    color: '#FFE082',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                Error Details (dev only)
                            </summary>
                            <pre
                                style={{
                                    fontSize: '0.75rem',
                                    color: '#EFB8C8',
                                    overflow: 'auto',
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
