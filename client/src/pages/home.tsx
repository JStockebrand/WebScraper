import { useState } from "react";
import { Search, Globe, Brain, Worm } from "lucide-react";
import SearchForm from "@/components/search-form";
import LoadingState from "@/components/loading-state";
import SearchResults from "@/components/search-results";

export default function Home() {
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'completed' | 'error'>('idle');
  const [searchId, setSearchId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearchSubmit = (query: string, searchId: number) => {
    setSearchQuery(query);
    setSearchId(searchId);
    setSearchStatus('searching');
  };

  const handleSearchComplete = () => {
    setSearchStatus('completed');
  };

  const handleSearchError = () => {
    setSearchStatus('error');
  };

  const handleRetrySearch = () => {
    setSearchStatus('idle');
    setSearchId(null);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Search className="text-primary text-2xl" />
              <h1 className="text-xl font-semibold text-foreground">WebScrape Summarizer</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">How it works</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">API Docs</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a>
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                Sign Up
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <SearchForm 
          onSubmit={handleSearchSubmit}
          disabled={searchStatus === 'searching'}
        />

        {/* Loading State */}
        {searchStatus === 'searching' && searchId && (
          <LoadingState 
            searchId={searchId}
            onComplete={handleSearchComplete}
            onError={handleSearchError}
          />
        )}

        {/* Search Results */}
        {searchStatus === 'completed' && searchId && (
          <SearchResults 
            searchId={searchId}
            searchQuery={searchQuery}
          />
        )}

        {/* Error State */}
        {searchStatus === 'error' && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-border p-8">
              <div className="text-destructive text-5xl mb-4">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Search Failed</h3>
              <p className="text-muted-foreground mb-6">
                We encountered an issue while searching. This might be due to API limits or network connectivity.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={handleRetrySearch}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <i className="fas fa-refresh mr-2"></i>
                  Try Again
                </button>
                <button className="w-full border border-border text-muted-foreground px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {searchStatus === 'idle' && (
          <div className="text-center py-16">
            <div className="max-w-2xl mx-auto">
              <div className="text-6xl text-muted mb-6">
                <Search className="mx-auto h-16 w-16" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4">Start Your Research</h3>
              <p className="text-lg text-muted-foreground mb-8">
                Enter a search query above to find, scrape, and summarize the most relevant content from across the web.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Search className="text-primary h-8 w-8" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Smart Search</h4>
                  <p className="text-sm text-muted-foreground">Advanced search algorithms find the most relevant sources</p>
                </div>
                <div className="text-center">
                  <div className="bg-orange-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Worm className="text-orange-500 h-8 w-8" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Web Scraping</h4>
                  <p className="text-sm text-muted-foreground">Extract content from multiple sources automatically</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Brain className="text-green-500 h-8 w-8" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">AI Summary</h4>
                  <p className="text-sm text-muted-foreground">Generate concise, intelligent summaries of findings</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Search className="text-primary h-6 w-6" />
                <h3 className="text-xl font-semibold text-foreground">WebScrape Summarizer</h3>
              </div>
              <p className="text-muted-foreground max-w-md">
                Intelligent web scraping and AI-powered summarization to help you research faster and smarter.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              © 2024 WebScrape Summarizer. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0 text-sm text-muted-foreground">
              <span>Status: <span className="text-green-500">All systems operational</span></span>
              <span>API: <span className="text-green-500">99.9% uptime</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
