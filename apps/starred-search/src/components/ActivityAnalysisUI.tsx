"use client";

import { useState } from 'react';
import { GitHubActivityFetcher, ActivityStats, TimeRange } from '@/lib/github-activity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, AlertCircle, Clock, Calendar, GitCommit, GitPullRequest, MessageSquare, CheckCircle, Code, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

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

  // Calculate averages per day for time-aware metrics
  const avgActivitiesPerDay = stats 
    ? (stats.totalCommits + stats.totalIssues + stats.totalPRs + stats.totalComments + stats.totalReviews) / stats.timeRangeDays 
    : 0;

  // Prepare hourly data (average per occurrence)
  const totalActivities = stats ? stats.totalCommits + stats.totalIssues + stats.totalPRs + stats.totalComments + stats.totalReviews : 0;
  const hourlyData = stats
    ? Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        activities: stats.hourlyActivity.get(hour) || 0,
        avgPerDay: ((stats.hourlyActivity.get(hour) || 0) / stats.timeRangeDays).toFixed(1),
      }))
    : [];

  // Prepare daily data (average per occurrence)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyData = stats
    ? Array.from({ length: 7 }, (_, day) => ({
        day: dayNames[day],
        activities: stats.dailyActivity.get(day) || 0,
        avgPerOccurrence: ((stats.dailyActivity.get(day) || 0) / Math.ceil(stats.timeRangeDays / 7)).toFixed(1),
      }))
    : [];

  // Prepare repo data (top 10)
  const repoData = stats
    ? Array.from(stats.repoActivity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([repo, activities]) => ({
          repo: repo.split('/')[1] || repo,
          activities,
        }))
    : [];

  // Activity type breakdown
  const activityTypeData = stats
    ? [
        { name: 'Commits', value: stats.totalCommits, color: 'hsl(var(--chart-1))' },
        { name: 'PRs', value: stats.totalPRs, color: 'hsl(var(--chart-2))' },
        { name: 'Issues', value: stats.totalIssues, color: 'hsl(var(--chart-3))' },
        { name: 'Comments', value: stats.totalComments, color: 'hsl(var(--chart-4))' },
        { name: 'Reviews', value: stats.totalReviews, color: 'hsl(var(--chart-5))' },
      ].filter(d => d.value > 0)
    : [];

  // Language distribution (top 5)
  const languageData = stats && stats.languages && stats.languages.size > 0
    ? Array.from(stats.languages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang, bytes]) => ({
          language: lang,
          bytes,
          percentage: ((bytes / Array.from(stats.languages.values()).reduce((a, b) => a + b, 0)) * 100).toFixed(1),
        }))
    : [];

  // Issue activity
  const issuesOpened = stats?.issues.filter(i => i.action === 'opened').length || 0;
  const issuesClosed = stats?.issues.filter(i => i.action === 'closed').length || 0;

  // PR activity
  const prsOpened = stats?.pullRequests.filter(p => p.action === 'opened').length || 0;
  const prsMerged = stats?.pullRequests.filter(p => p.action === 'merged').length || 0;
  const prsClosed = stats?.pullRequests.filter(p => p.action === 'closed' && p.action !== 'merged').length || 0;

  // Find peak hours
  const peakHour = hourlyData.reduce(
    (max, item) => (item.activities > max.activities ? item : max),
    { hour: '', activities: 0, avgPerDay: '0' }
  );

  const peakDay = dailyData.reduce(
    (max, item) => (item.activities > max.activities ? item : max),
    { day: '', activities: 0, avgPerOccurrence: '0' }
  );

  // Comment type breakdown
  const commentsByType = stats 
    ? [
        { type: 'Issue', count: stats.comments.filter(c => c.type === 'issue').length },
        { type: 'PR', count: stats.comments.filter(c => c.type === 'pr').length },
        { type: 'Commit', count: stats.comments.filter(c => c.type === 'commit').length },
      ].filter(d => d.count > 0)
    : [];

  // Review breakdown
  const reviewsByState = stats
    ? [
        { state: 'Approved', count: stats.reviews.filter(r => r.state === 'approved').length },
        { state: 'Changes', count: stats.reviews.filter(r => r.state === 'changes_requested').length },
        { state: 'Commented', count: stats.reviews.filter(r => r.state === 'commented').length },
      ].filter(d => d.count > 0)
    : [];

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Analyze GitHub activity
          </CardTitle>
          <CardDescription>
            Deep insights into commits, PRs, issues, reviews, and collaboration patterns
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
                <span className="text-muted-foreground">Analyzing activity data...</span>
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
                <CardDescription>Total activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalActivities}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{avgActivitiesPerDay.toFixed(1)} per day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Repositories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueRepos.size}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.collaborationRepos.size} collaboration
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Peak hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{peakHour.hour}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {peakHour.activities} activities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Most active day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{peakDay.day}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {peakDay.activities} activities
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Type Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4" />
                  Activity breakdown
                </CardTitle>
                <CardDescription>Distribution of activity types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activityTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {activityTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4" />
                    <span>{stats.totalCommits} commits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4" />
                    <span>{stats.totalPRs} PRs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{stats.totalIssues} issues</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>{stats.totalComments} comments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>{stats.totalReviews} reviews</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language Distribution */}
            {languageData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Code className="w-4 h-4" />
                    Top languages
                  </CardTitle>
                  <CardDescription>Most used programming languages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {languageData.map((lang, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{lang.language}</span>
                          <span className="text-muted-foreground">{lang.percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${lang.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Issues & PRs Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="w-4 h-4" />
                  Issue activity
                </CardTitle>
                <CardDescription>Issues opened and closed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Opened</span>
                    <span className="text-2xl font-bold text-chart-1">{issuesOpened}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Closed</span>
                    <span className="text-2xl font-bold text-chart-2">{issuesClosed}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Net: {issuesOpened - issuesClosed > 0 ? '+' : ''}{issuesOpened - issuesClosed} open
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitPullRequest className="w-4 h-4" />
                  Pull request activity
                </CardTitle>
                <CardDescription>PRs opened, merged, and closed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Opened</span>
                    <span className="text-2xl font-bold text-chart-1">{prsOpened}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Merged</span>
                    <span className="text-2xl font-bold text-chart-2">{prsMerged}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Closed (no merge)</span>
                    <span className="text-2xl font-bold text-chart-3">{prsClosed}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Merge rate: {prsOpened > 0 ? ((prsMerged / prsOpened) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comments & Reviews */}
          {(commentsByType.length > 0 || reviewsByState.length > 0) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {commentsByType.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="w-4 h-4" />
                      Comment distribution
                    </CardTitle>
                    <CardDescription>Where comments were made</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={commentsByType}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="type" className="text-xs" tick={{ fontSize: 12 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {reviewsByState.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle className="w-4 h-4" />
                      Review breakdown
                    </CardTitle>
                    <CardDescription>PR review types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={reviewsByState}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="state" className="text-xs" tick={{ fontSize: 12 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Hourly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4" />
                Activity by hour of day
              </CardTitle>
              <CardDescription>
                When are you most active? (avg {peakHour.avgPerDay} activities/day at {peakHour.hour})
              </CardDescription>
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
                    formatter={(value: number) => [`${value} total (${((value / stats.timeRangeDays)).toFixed(1)} avg/day)`, 'Activities']}
                  />
                  <Bar dataKey="activities" radius={[4, 4, 0, 0]}>
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
                Activity by day of week
              </CardTitle>
              <CardDescription>
                Which days are you most productive? (avg {peakDay.avgPerOccurrence} activities per {peakDay.day})
              </CardDescription>
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
                    formatter={(value: number) => [`${value} total (${((value / Math.ceil(stats.timeRangeDays / 7))).toFixed(1)} avg per occurrence)`, 'Activities']}
                  />
                  <Bar dataKey="activities" radius={[4, 4, 0, 0]}>
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
                  <Users className="w-4 h-4" />
                  Most active repositories
                </CardTitle>
                <CardDescription>Top {repoData.length} repos by total activity</CardDescription>
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
                    <Bar dataKey="activities" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Collaboration Insight */}
          {stats.collaborationRepos.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4" />
                  Collaboration patterns
                </CardTitle>
                <CardDescription>
                  Repositories where you contributed without direct commits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{stats.collaborationRepos.size}</div>
                  <p className="text-sm text-muted-foreground">
                    repos with reviews, comments, or issues only
                  </p>
                  <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Array.from(stats.collaborationRepos).slice(0, 10).map((repo, i) => (
                      <div key={i} className="truncate text-muted-foreground">
                        • {repo}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No activity message */}
          {totalActivities === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No activity found for this time range. Note: GitHub API only provides the last 90 days of public event data.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}