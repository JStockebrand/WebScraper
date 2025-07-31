import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeleteAccountDialog } from '@/components/auth/DeleteAccountDialog';
import { Home, Search, Calendar, Globe, Trash2, Heart, Star, Loader2 } from 'lucide-react';

interface SearchHistory {
  id: string;
  query: string;
  status: string;
  createdAt: string;
  summaryText: string | null;
  totalResults: number;
  confidence: number | null;
  isSaved: boolean;
}

export function AccountPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [savingSearchIds, setSavingSearchIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: searchHistory = [], isLoading } = useQuery<SearchHistory[]>({
    queryKey: ['/api/searches/history'],
    enabled: !!user,
  });

  const { data: savedSearches = [], isLoading: isLoadingSaved } = useQuery<SearchHistory[]>({
    queryKey: ['/api/searches/saved'],
    enabled: !!user,
  });

  // Get last 5 searches and last 5 saved searches
  const recentSearches = searchHistory.slice(0, 5);
  const recentSaved = savedSearches.slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    setLocation('/auth');
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return 'No summary available';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const toggleSaveSearch = async (searchId: string, currentlySaved: boolean) => {
    if (!user) return;
    
    setSavingSearchIds(prev => new Set(prev).add(searchId));
    
    try {
      const token = localStorage.getItem('supabase_token');
      if (!token) {
        alert('Please log in again to save searches.');
        return;
      }

      const response = await fetch(`/api/searches/${searchId}/toggle-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Refetch both search history and saved searches to update the UI
        queryClient.invalidateQueries({ queryKey: ['/api/searches/history'] });
        queryClient.invalidateQueries({ queryKey: ['/api/searches/saved'] });
      } else {
        alert('Failed to update search. Please try again.');
      }
    } catch (err) {
      alert('An error occurred. Please try again.');
    } finally {
      setSavingSearchIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(searchId);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Account Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user.displayName || user.email}
              </p>
            </div>
            <Button
              onClick={() => setLocation('/')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Search
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <Badge variant="secondary">{user.subscriptionTier}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Current plan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Searches Used</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user.searchesUsed} / {user.searchesLimit}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {searchHistory.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Search History and Saved Searches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Searches
              </CardTitle>
              <CardDescription>
                Your last 5 searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : recentSearches.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No searches yet</p>
                  <p className="text-sm">Start searching to see your history here</p>
                  <Button
                    onClick={() => setLocation('/')}
                    className="mt-4"
                    variant="outline"
                  >
                    Start Searching
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSearches.map((search: SearchHistory) => (
                    <div key={search.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm truncate flex-1 pr-2">
                          {search.query}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(search.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSaveSearch(search.id, search.isSaved)}
                            disabled={savingSearchIds.has(search.id)}
                            className={`p-1 h-7 w-7 ${search.isSaved ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
                          >
                            {savingSearchIds.has(search.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Heart className={`w-3 h-3 ${search.isSaved ? "fill-current" : ""}`} />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {formatDate(search.createdAt)} • {search.totalResults} results
                        {search.confidence && (
                          <span> • {Math.round(search.confidence * 100)}% confidence</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {truncateText(search.summaryText, 80)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved/Liked Searches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Saved Searches
              </CardTitle>
              <CardDescription>
                Your favorite searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSaved ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : recentSaved.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No saved searches yet</p>
                  <p className="text-sm">Click the heart button on searches to save them here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSaved.map((search: SearchHistory) => (
                    <div key={search.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm truncate flex-1 pr-2">
                          {search.query}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(search.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSaveSearch(search.id, search.isSaved)}
                            disabled={savingSearchIds.has(search.id)}
                            className="p-1 h-7 w-7 bg-red-500 hover:bg-red-600 text-white"
                          >
                            {savingSearchIds.has(search.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Heart className="w-3 h-3 fill-current" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {formatDate(search.createdAt)} • {search.totalResults} results
                        {search.confidence && (
                          <span> • {Math.round(search.confidence * 100)}% confidence</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {truncateText(search.summaryText, 80)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Settings */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that will permanently affect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">Delete Account</h4>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="ml-4 flex-shrink-0"
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </div>
  );
}