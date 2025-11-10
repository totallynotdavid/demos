"use client";

import { useState } from 'react';
import { GitHubActivityFetcher, ActivityStats, TimeRange } from '@/lib/github-activity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

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

  const avgActivitiesPerDay = stats 
    ? (stats.totalCommits + stats.totalIssues + stats.totalPRs + stats.totalComments + stats.totalReviews) / stats.timeRangeDays 
    : 0;

  const totalActivities = stats ? stats.totalCommits + stats.totalIssues + stats.totalPRs + stats.totalComments + stats.totalReviews : 0;
  
  const hourlyData = stats
    ? Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        activities: stats.hourlyActivity.get(hour) || 0,
      }))
    : [];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyData = stats
    ? Array.from({ length: 7 }, (_, day) => ({
        day: dayNames[day],
        activities: stats.dailyActivity.get(day) || 0,
      }))
    : [];

  const activityTypeData = stats
    ? [
        { name: 'Commits', value: stats.totalCommits, color: '#888' },
        { name: 'PRs', value: stats.totalPRs, color: '#666' },
        { name: 'Issues', value: stats.totalIssues, color: '#999' },
        { name: 'Comments', value: stats.totalComments, color: '#777' },
        { name: 'Reviews', value: stats.totalReviews, color: '#555' },
      ].filter(d => d.value > 0)
    : [];

  const languageData = stats && stats.languages && stats.languages.size > 0
    ? Array.from(stats.languages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang, bytes]) => ({
          language: lang,
          percentage: ((bytes / Array.from(stats.languages.values()).reduce((a, b) => a + b, 0)) * 100).toFixed(0),
        }))
    : [];

  const issuesOpened = stats?.issues.filter(i => i.action === 'opened').length || 0;
  const issuesClosed = stats?.issues.filter(i => i.action === 'closed').length || 0;
  const prsOpened = stats?.pullRequests.filter(p => p.action === 'opened').length || 0;
  const prsMerged = stats?.pullRequests.filter(p => p.action === 'merged').length || 0;

  const peakHour = hourlyData.reduce(
    (max, item) => (item.activities > max.activities ? item : max),
    { hour: '', activities: 0 }
  );

  const peakDay = dailyData.reduce(
    (max, item) => (item.activities > max.activities ? item : max),
    { day: '', activities: 0 }
  );

  return (
    <div className="space-y-12">
      {/* Form */}
      <div className="space-y-6">
        <div className="flex gap-3">
          <Input
            placeholder="GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isAnalyzing}
            className="flex-1 h-11 text-base"
            onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && handleAnalyze()}
          />
          <Input
            type="password"
            placeholder="Token (optional)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isAnalyzing}
            className="flex-1 h-11 text-base"
            onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && handleAnalyze()}
          />
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)} disabled={isAnalyzing}>
            <SelectTrigger className="w-40 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3days">3 days</SelectItem>
              <SelectItem value="1week">1 week</SelectItem>
              <SelectItem value="1month">1 month</SelectItem>
              <SelectItem value="3months">3 months</SelectItem>
              <SelectItem value="6months">6 months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAnalyze} disabled={isAnalyzing} className="h-11 px-8">
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        
        {isAnalyzing && (
          <p className="text-sm text-muted-foreground">
            Loading activity data ({progress.current}/{progress.total} pages)
          </p>
        )}
      </div>

      {/* Results */}
      {stats && totalActivities > 0 && (
        <div className="space-y-16">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-light tabular-nums">{totalActivities}</div>
              <div className="text-xs text-muted-foreground mt-1">Total activities</div>
            </div>
            <div>
              <div className="text-3xl font-light tabular-nums">{stats.uniqueRepos.size}</div>
              <div className="text-xs text-muted-foreground mt-1">Repositories</div>
            </div>
            <div>
              <div className="text-3xl font-light tabular-nums">{peakHour.hour}</div>
              <div className="text-xs text-muted-foreground mt-1">Peak hour</div>
            </div>
            <div>
              <div className="text-3xl font-light tabular-nums">{peakDay.day}</div>
              <div className="text-xs text-muted-foreground mt-1">Most active day</div>
            </div>
          </div>

          {/* Activity Breakdown */}
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Activity breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={activityTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="currentColor"
                    dataKey="value"
                    stroke="none"
                  >
                    {activityTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>{stats.totalCommits} Commits</div>
                <div>{stats.totalPRs} PRs</div>
                <div>{stats.totalIssues} Issues</div>
                <div>{stats.totalComments} Comments</div>
                <div>{stats.totalReviews} Reviews</div>
              </div>
            </div>

            {languageData.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Top languages</h3>
                <div className="space-y-3 pt-4">
                  {languageData.map((lang, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span>{lang.language}</span>
                        <span className="text-muted-foreground tabular-nums">{lang.percentage}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-foreground/60 rounded-full"
                          style={{ width: `${lang.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Issues & PRs */}
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Issues</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opened</span>
                  <span className="tabular-nums">{issuesOpened}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closed</span>
                  <span className="tabular-nums">{issuesClosed}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Net</span>
                  <span className="tabular-nums">{issuesOpened - issuesClosed > 0 ? '+' : ''}{issuesOpened - issuesClosed}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Pull requests</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opened</span>
                  <span className="tabular-nums">{prsOpened}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Merged</span>
                  <span className="tabular-nums">{prsMerged}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Merge rate</span>
                  <span className="tabular-nums">{prsOpened > 0 ? ((prsMerged / prsOpened) * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Activity */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Activity by hour</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  interval={2}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="activities" radius={[2, 2, 0, 0]}>
                  {hourlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.hour === peakHour.hour ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Activity */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Activity by day</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="activities" radius={[2, 2, 0, 0]}>
                  {dailyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.day === peakDay.day ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {stats.collaborationRepos.size > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Collaboration</h3>
              <p className="text-sm text-muted-foreground">
                {stats.collaborationRepos.size} repositories with reviews, comments, or issues (no commits)
              </p>
            </div>
          )}
        </div>
      )}

      {stats && totalActivities === 0 && (
        <p className="text-sm text-muted-foreground">
          No activity found for this time range
        </p>
      )}
    </div>
  );
}