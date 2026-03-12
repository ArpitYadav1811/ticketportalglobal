"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class AdminErrorBoundary extends Component<Props, State> {
  static displayName = "AdminErrorBoundary"
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin Dashboard Error:", error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="bg-card border border-red-200 dark:border-red-900/50 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  An error occurred while loading this section. Please try refreshing or contact support if the problem
                  persists.
                </p>
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mb-4">
                    <summary className="text-xs text-muted-foreground cursor-pointer mb-2">
                      Error Details (Development Only)
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2">
                  <Button onClick={this.handleReset} size="sm" variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
