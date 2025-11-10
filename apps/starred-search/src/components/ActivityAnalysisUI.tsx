"use client";

import { useState } from 'react';
import { GitHubActivityFetcher, ActivityStats, TimeRange } from '@/lib/github-activity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, AlertCircle, Clock, Calendar, GitCommit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function ActivityAnalysisUI() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('1month');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleAnalyze = async () => {
    if (!username.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setStats(null);
    setProgress({ current: 0, total: 0 });

    try {
      const fetcher = new GitHubActivityFetcher(token || undefined);
      const activityStats = await fetcher.fetchUserActivity(
        username,
        timeRange,
        (current, total) => {
          setProgress({ current, total });
        }
      );

      setStats(activityStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const timeRangeLabels: Record<TimeRange, string> = {
    '3days': 'Last 3 days',
    '1week': 'Last week',
    '1month': 'Last month',
    '3months': 'Last 3 months',
    '6months': 'Last 6 months',
  };

  // Prepare hourly data
  const hourlyData = stats
    ? Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        commits: stats.hourlyActivity.get(hour) || 0,
      }))
    : [];

  // Prepare daily data
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyData = stats
    ? Array.from({ length: 7 }, (_, day) => ({
        day: dayNames[day],
        commits: stats.dailyActivity.get(day) || 0,
      }))
    : [];

  // Prepare repo data (top 10)
  const repoData = stats
    ? Array.from(stats.repoActivity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([repo, commits]) => ({
          repo: repo.split('/')[1] || repo, // Show only repo name, not owner/repo
          commits,
        }))
    : [];

  // Find peak hours
  const peakHour = hourlyData.reduce(
    (max, item) => (item.commits > max.commits ? item : max),
    { hour: '', commits: 0 }
  );

  const peakDay = dailyData.reduce(
    (max, item) => (item.commits > max.commits ? item : max),
    { day: '', commits: 0 }
  );

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Analyze GitHub activity
          </CardTitle>
          <CardDescription>
            Discover commit patterns and find out when you're most productive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="activity-username">GitHub username</Label>
              <Input
                id="activity-username"
                placeholder="octocat"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-range">Time range</Label>
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)} disabled={isAnalyzing}>
                <SelectTrigger id="time-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3days">Last 3 days</SelectItem>
                  <SelectItem value="1week">Last week</SelectItem>
                  <SelectItem value="1month">Last month</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                  <SelectItem value="6months">Last 6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-token">Personal access token (optional)</Label>
            <Input
              id="activity-token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isAnalyzing}
            />
            <p className="text-xs text-muted-foreground">
              Increases rate limit from 60 to 5000 requests/hour
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fetching activity data...</span>
                <span className="font-medium">
                  {progress.current}/{progress.total} pages
                </span>
              </div>
            </div>
          )}

          <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Analyze activity
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {stats && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total commits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCommits}</div>
                <p className="text-xs text-muted-foreground mt-1">{timeRangeLabels[timeRange]}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active repositories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.repoActivity.size}</div>
                <p className="text-xs text-muted-foreground mt-1">Different repos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Peak hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{peakHour.hour}</div>
                <p className="text-xs text-muted-foreground mt-1">{peakHour.commits} commits</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Most active day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{peakDay.day}</div>
                <p className="text-xs text-muted-foreground mt-1">{peakDay.commits} commits</p>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4" />
                Commits by hour of day
              </CardTitle>
              <CardDescription>When do you commit the most?</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                    interval={2}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="commits" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.hour === peakHour.hour ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4" />
                Commits by day of week
              </CardTitle>
              <CardDescription>Which days are you most productive?</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="commits" radius={[4, 4, 0, 0]}>
                    {dailyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.day === peakDay.day ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Repository Activity */}
          {repoData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitCommit className="w-4 h-4" />
                  Most active repositories
                </CardTitle>
                <CardDescription>Top {repoData.length} repositories by commit count</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={repoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" tick={{ fontSize: 12 }} />
                    <YAxis 
                      dataKey="repo" 
                      type="category" 
                      width={150}
                      className="text-xs" 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="commits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* No commits message */}
          {stats.totalCommits === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No commits found for this time range. Note: GitHub API only provides the last 90 days of activity data.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
