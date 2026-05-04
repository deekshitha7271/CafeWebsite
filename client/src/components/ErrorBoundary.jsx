import { Component } from 'react';
import { Crown } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-black text-white mb-2">Something went wrong</h1>
            <p className="text-text-muted text-sm max-w-sm">
              {this.state.error?.message || 'An unexpected error occurred. Please refresh the page.'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-primary text-background rounded-full font-black uppercase tracking-widest text-xs hover:bg-primary-light transition-all"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
