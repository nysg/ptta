import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type SessionWithStats, type Event, type EventSearchResult, type EventType } from './lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { useState } from 'react';

// ========================================
// Sessions List Page
// ========================================

function SessionsPage() {
  const navigate = useNavigate();
  const [activeOnly, setActiveOnly] = useState(false);

  const { data: sessions, isLoading } = useQuery<SessionWithStats[]>({
    queryKey: ['sessions', { active: activeOnly }],
    queryFn: () => api.getSessions({ active: activeOnly, limit: 50 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">ptta v2</h1>
            <p className="text-muted-foreground">AI External Memory - Event Stream</p>
          </div>
          <div className="flex gap-2">
            <Link to="/search">
              <Button variant="outline">Search</Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.sessions.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.sessions.active} active, {stats.sessions.ended} ended
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.events.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">File Edits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.files.total_edits}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.files.unique_files} unique files
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={!activeOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveOnly(false)}
          >
            All
          </Button>
          <Button
            variant={activeOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveOnly(true)}
          >
            Active Only
          </Button>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Sessions</h2>

          {sessions && sessions.length > 0 ? (
            <div className="grid gap-4">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/sessions/${session.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {session.workspace_path.split('/').pop() || 'Workspace'}
                          </CardTitle>
                          {!session.ended_at && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <CardDescription className="mt-2 font-mono text-xs">
                          {session.workspace_path}
                        </CardDescription>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{new Date(session.started_at).toLocaleString()}</div>
                        {session.event_count > 0 && (
                          <div className="mt-1">{session.event_count} events</div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No sessions found. Start using ptta CLI to create sessions.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// Session Detail Page (Timeline)
// ========================================

function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events', id],
    queryFn: () => api.getSessionEvents(id!, { limit: 200 }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
            ← Back to Sessions
          </Button>
          {session && (
            <>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Session Timeline</h1>
              <p className="text-muted-foreground font-mono text-sm">{session.workspace_path}</p>
              <div className="text-sm text-muted-foreground mt-2">
                Started: {new Date(session.started_at).toLocaleString()}
                {session.ended_at && ` • Ended: ${new Date(session.ended_at).toLocaleString()}`}
              </div>
            </>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {events && events.length > 0 ? (
            events.map((event) => <EventCard key={event.id} event={event} />)
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No events in this session.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// Search Page
// ========================================

function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: results, isLoading } = useQuery<EventSearchResult[]>({
    queryKey: ['search', searchQuery],
    queryFn: () => api.search(searchQuery),
    enabled: searchQuery.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
          ← Back to Sessions
        </Button>

        <h1 className="text-3xl font-bold tracking-tight mb-6">Search Events</h1>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for content..."
              className="flex-1 px-4 py-2 border rounded-md"
            />
            <Button type="submit" disabled={query.length === 0}>
              Search
            </Button>
          </div>
        </form>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Searching...</p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Found {results.length} results</p>
            {results.map((result) => (
              <Card
                key={result.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/sessions/${result.session_id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {result.type}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    {renderEventData(result.data, result.type)}
                  </div>
                  <CardDescription className="mt-2 text-xs">
                    Session: {result.session.workspace_path}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {results && results.length === 0 && searchQuery && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No results found for "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ========================================
// Event Card Component
// ========================================

function EventCard({ event }: { event: Event }) {
  const typeColors: Record<EventType, string> = {
    user_message: 'bg-blue-100 text-blue-800',
    assistant_message: 'bg-green-100 text-green-800',
    thinking: 'bg-yellow-100 text-yellow-800',
    code_intention: 'bg-purple-100 text-purple-800',
    file_edit: 'bg-orange-100 text-orange-800',
    tool_use: 'bg-gray-100 text-gray-800',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded ${typeColors[event.type]}`}>
              {event.type}
            </span>
            <span className="text-sm text-muted-foreground">#{event.sequence}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {new Date(event.timestamp).toLocaleString()}
          </span>
        </div>
        <div>{renderEventData(event.data, event.type)}</div>
      </CardHeader>
    </Card>
  );
}

// ========================================
// Render Event Data
// ========================================

function renderEventData(data: any, type: EventType) {
  switch (type) {
    case 'user_message':
    case 'assistant_message':
      return (
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{data.content}</p>
        </div>
      );

    case 'thinking':
      return (
        <div className="text-sm">
          {data.context && (
            <span className="text-muted-foreground mr-2">[{data.context}]</span>
          )}
          <span className="italic">{data.content}</span>
        </div>
      );

    case 'code_intention':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{data.action}</span>
            <span className="font-mono text-sm">{data.file_path}</span>
          </div>
          <p className="text-sm text-muted-foreground">Reason: {data.reason}</p>
        </div>
      );

    case 'file_edit':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{data.action}</span>
            <span className="font-mono text-sm">{data.file_path}</span>
            {data.success ? (
              <span className="text-green-600">✓</span>
            ) : (
              <span className="text-red-600">✗</span>
            )}
          </div>
          {data.diff && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">View diff</summary>
              <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">{data.diff}</pre>
            </details>
          )}
        </div>
      );

    case 'tool_use':
      return (
        <div className="space-y-1">
          <div className="font-mono text-sm">{data.tool}</div>
          {data.duration_ms && (
            <div className="text-xs text-muted-foreground">{data.duration_ms}ms</div>
          )}
        </div>
      );

    default:
      return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
  }
}

// ========================================
// Main App
// ========================================

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SessionsPage />} />
      <Route path="/sessions/:id" element={<SessionDetailPage />} />
      <Route path="/search" element={<SearchPage />} />
    </Routes>
  );
}
