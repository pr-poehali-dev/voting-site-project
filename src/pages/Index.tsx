import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import AuthModal from '@/components/AuthModal';
import CreatePollModal from '@/components/CreatePollModal';
import { useToast } from '@/hooks/use-toast';

interface PollOption {
  id: number;
  option_text: string;
  votes_count: number;
}

interface Poll {
  id: number;
  title: string;
  description: string;
  status: string;
  options: PollOption[];
  totalVotes: number;
  created_by?: number;
  created_at?: string;
  creator?: string;
  creator_name?: string;
}

interface User {
  id: number;
  phone: string;
  name: string;
  role: string;
}

interface UserVote {
  poll_id: number;
  option_id: number;
}

const Index = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [userVotes, setUserVotes] = useState<UserVote[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createPollModalOpen, setCreatePollModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('new');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pollToDelete, setPollToDelete] = useState<number | null>(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pollToChangeStatus, setPollToChangeStatus] = useState<Poll | null>(null);
  const { toast } = useToast();

  // Check authentication on page load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        loadUserVotes(user.id);
      } catch (error) {
        console.error('Failed to parse user from localStorage', error);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
      }
    }
  }, []);

  // Load user votes
  const loadUserVotes = async (userId: number) => {
    try {
      const response = await fetch(`https://functions.poehali.dev/0b3cf8f7-e77c-4ff3-9d11-4aae9401ce7c?user_id=${userId}`);
      const data = await response.json();
      
      if (data.voted_polls) {
        const votesArray = data.voted_polls.map((pollId: number) => ({ poll_id: pollId, option_id: 0 }));
        setUserVotes(votesArray);
      }
    } catch (error) {
      console.error('Failed to load user votes', error);
    }
  };

  // Load polls from API
  const loadPolls = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/0b3cf8f7-e77c-4ff3-9d11-4aae9401ce7c');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setPolls(data);
      } else {
        setPolls([]);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить голосования',
        variant: 'destructive'
      });
      setPolls([]);
    } finally {
      setLoading(false);
    }
  };

  // Load polls on component mount
  useEffect(() => {
    loadPolls();
  }, []);

  // Vote on poll
  const handleVote = async (pollId: number, optionId: number) => {
    if (!currentUser) {
      toast({
        title: 'Требуется авторизация',
        description: 'Войдите в систему для голосования',
        variant: 'destructive'
      });
      setAuthModalOpen(true);
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/0b3cf8f7-e77c-4ff3-9d11-4aae9401ce7c', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          poll_id: pollId,
          option_id: optionId,
          user_id: currentUser.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Успешно!',
          description: 'Ваш голос учтен'
        });
        // Reload polls and user votes to get updated counts
        loadPolls();
        loadUserVotes(currentUser.id);
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось проголосовать',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Проблема с подключением',
        variant: 'destructive'
      });
    }
  };

  // Delete poll (owner only)
  const handleDeletePoll = async (pollId: number) => {
    if (!currentUser || currentUser.role !== 'owner') {
      toast({
        title: 'Доступ запрещен',
        description: 'Только владелец может удалять голосования',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/40bcc29c-0772-4614-813b-079d0b6f24f3', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString(),
          'X-User-Role': currentUser.role
        },
        body: JSON.stringify({
          poll_id: pollId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Успешно!',
          description: 'Голосование удалено'
        });
        // Reload polls
        loadPolls();
        setDeleteDialogOpen(false);
        setPollToDelete(null);
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось удалить голосование',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Проблема с подключением',
        variant: 'destructive'
      });
    }
  };

  // Toggle poll status (owner only)
  const handleTogglePollStatus = async (pollId: number, currentStatus: string) => {
    if (!currentUser || currentUser.role !== 'owner') {
      toast({
        title: 'Доступ запрещен',
        description: 'Только владелец может изменять статус голосований',
        variant: 'destructive'
      });
      return;
    }

    const newStatus = currentStatus === 'active' ? 'closed' : 'active';

    try {
      const response = await fetch('https://functions.poehali.dev/40bcc29c-0772-4614-813b-079d0b6f24f3', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString(),
          'X-User-Role': currentUser.role
        },
        body: JSON.stringify({
          poll_id: pollId,
          status: newStatus
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Успешно!',
          description: `Голосование ${newStatus === 'active' ? 'открыто' : 'закрыто'}`
        });
        loadPolls();
        setStatusChangeDialogOpen(false);
        setPollToChangeStatus(null);
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось изменить статус',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Проблема с подключением',
        variant: 'destructive'
      });
    }
  };

  // Handle authentication success
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    loadPolls();
    loadUserVotes(user.id);
  };

  // Handle create poll success
  const handleCreatePollSuccess = () => {
    loadPolls();
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    setUserVotes([]);
    toast({
      title: 'Выход выполнен',
      description: 'Вы вышли из системы'
    });
  };

  // Open create poll modal
  const handleOpenCreatePoll = () => {
    if (!currentUser) {
      toast({
        title: 'Требуется авторизация',
        description: 'Войдите в систему для создания голосования',
        variant: 'destructive'
      });
      setAuthModalOpen(true);
      return;
    }
    setCreatePollModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (pollId: number) => {
    setPollToDelete(pollId);
    setDeleteDialogOpen(true);
  };

  // Open status change dialog
  const openStatusChangeDialog = (poll: Poll) => {
    setPollToChangeStatus(poll);
    setStatusChangeDialogOpen(true);
  };

  // Filter and sort polls
  const filteredAndSortedPolls = useMemo(() => {
    const filtered = polls.filter(poll => {
      // Search filter
      const matchesSearch = poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           poll.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      let matchesStatus = true;
      if (filterStatus === 'active') {
        matchesStatus = poll.status === 'active';
      } else if (filterStatus === 'closed') {
        matchesStatus = poll.status === 'closed';
      } else if (filterStatus === 'my_votes' && currentUser) {
        matchesStatus = userVotes.some(vote => vote.poll_id === poll.id);
      }

      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'new') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      } else if (sortBy === 'popular') {
        return b.totalVotes - a.totalVotes;
      } else if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return filtered;
  }, [polls, searchQuery, filterStatus, sortBy, userVotes, currentUser]);

  // Statistics
  const stats = useMemo(() => {
    const totalPolls = polls.length;
    const activePolls = polls.filter(p => p.status === 'active').length;
    const totalVotes = polls.reduce((acc, poll) => acc + poll.totalVotes, 0);
    const myVotes = userVotes.length;

    return { totalPolls, activePolls, totalVotes, myVotes };
  }, [polls, userVotes]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((j) => (
              <div key={j}>
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Poll card component
  const PollCard = ({ poll }: { poll: Poll }) => {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isVoting, setIsVoting] = useState(false);
    
    // Check if user has voted
    const userVote = userVotes.find(vote => vote.poll_id === poll.id);
    const hasVoted = !!userVote;

    const handleVoteClick = async () => {
      if (selectedOption === null) {
        toast({
          title: 'Выберите вариант',
          description: 'Пожалуйста, выберите один из вариантов ответа',
          variant: 'destructive'
        });
        return;
      }

      setIsVoting(true);
      await handleVote(poll.id, selectedOption);
      setIsVoting(false);
      setSelectedOption(null);
    };

    // Calculate participation percentage (assuming max possible voters is total users, simplified to show percentage)
    const participationPercentage = poll.totalVotes > 0 ? Math.min(100, (poll.totalVotes / 10) * 100) : 0;

    return (
      <Card className="group hover:shadow-2xl transition-all duration-300 animate-scale-in border-2 hover:border-transparent bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
        
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant={poll.status === 'active' ? 'default' : 'secondary'}
                  className={poll.status === 'active' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0' 
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0'}
                >
                  {poll.status === 'active' ? '🟢 Активно' : '🔴 Завершено'}
                </Badge>
                {hasVoted && (
                  <Badge variant="outline" className="border-primary text-primary">
                    ✓ Вы проголосовали
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl mb-2 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-bold">
                {poll.title}
              </CardTitle>
              <CardDescription className="mb-3">{poll.description}</CardDescription>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Icon name="User" size={14} />
                  <span>{poll.creator || poll.creator_name || 'Неизвестно'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Icon name="Calendar" size={14} />
                  <span>{formatDate(poll.created_at)}</span>
                </div>
              </div>
            </div>
            {currentUser?.role === 'owner' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openStatusChangeDialog(poll)}
                  className="h-7 px-2"
                  title={poll.status === 'active' ? 'Закрыть голосование' : 'Открыть голосование'}
                >
                  <Icon name={poll.status === 'active' ? 'Lock' : 'Unlock'} size={14} />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openDeleteDialog(poll.id)}
                  className="h-7 px-2"
                  title="Удалить голосование"
                >
                  <Icon name="Trash2" size={14} />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {poll.options.map((option, index) => {
            const percentage = poll.totalVotes > 0 ? (option.votes_count / poll.totalVotes) * 100 : 0;
            const isSelected = selectedOption === option.id;
            const isVotedOption = userVote?.option_id === option.id;
            
            // Gradient colors for progress bars
            const gradients = [
              'from-blue-500 to-cyan-500',
              'from-purple-500 to-pink-500',
              'from-orange-500 to-red-500',
              'from-green-500 to-emerald-500',
              'from-yellow-500 to-amber-500',
            ];
            const gradient = gradients[index % gradients.length];
            
            return (
              <div 
                key={option.id} 
                className={`space-y-2 animate-fade-in cursor-pointer p-3 rounded-lg transition-all duration-200 border-2 ${
                  isVotedOption 
                    ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20' 
                    : isSelected 
                    ? 'bg-secondary/10 border-secondary scale-[1.02]' 
                    : 'hover:bg-muted/50 border-transparent hover:border-muted'
                }`}
                onClick={() => poll.status === 'active' && !hasVoted && setSelectedOption(option.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{option.option_text}</span>
                    {isVotedOption && (
                      <span className="text-primary text-xs">✓ Ваш выбор</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground font-semibold">{option.votes_count} голосов</span>
                </div>
                <div className="relative">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${gradient} transition-all duration-500 ease-out rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700 dark:text-gray-300">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
          
          {poll.status === 'closed' && (
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 text-center">
              <Icon name="Lock" size={24} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-semibold text-muted-foreground">Голосование завершено</p>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-4 border-t gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon name="Users" size={16} />
                <span>Всего: {poll.totalVotes} голосов</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon name="TrendingUp" size={16} />
                <span>Активность: {participationPercentage.toFixed(0)}%</span>
              </div>
            </div>
            {!hasVoted && poll.status === 'active' && (
              <Button 
                className="bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 text-white transition-all hover:scale-105"
                onClick={handleVoteClick}
                disabled={isVoting}
              >
                {isVoting ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Голосование...
                  </>
                ) : (
                  <>
                    <Icon name="Vote" size={16} className="mr-2" />
                    Голосовать
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary via-secondary to-accent flex items-center justify-center shadow-lg">
                <Icon name="Vote" size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Голосование.pу</h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser ? (
                <>
                  <Avatar className="cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all" onClick={() => setActiveTab('profile')}>
                    <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <Badge variant="outline" className="text-xs">{currentUser.role}</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout} className="hover:border-destructive hover:text-destructive">
                    <Icon name="LogOut" size={16} className="mr-2" />
                    Выход
                  </Button>
                </>
              ) : (
                <Button 
                  className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-lg hover:shadow-xl transition-all"
                  onClick={() => setAuthModalOpen(true)}
                >
                  <Icon name="LogIn" size={16} className="mr-2" />
                  Войти
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-1 shadow-lg">
            <TabsTrigger value="home" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all">
              <Icon name="Home" size={16} className="mr-2" />
              <span className="hidden sm:inline">Главная</span>
            </TabsTrigger>
            <TabsTrigger value="polls" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all">
              <Icon name="BarChart" size={16} className="mr-2" />
              <span className="hidden sm:inline">Голосования</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all">
              <Icon name="Plus" size={16} className="mr-2" />
              <span className="hidden sm:inline">Создать</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all">
              <Icon name="TrendingUp" size={16} className="mr-2" />
              <span className="hidden sm:inline">Результаты</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all">
              <Icon name="User" size={16} className="mr-2" />
              <span className="hidden sm:inline">Профиль</span>
            </TabsTrigger>
            {currentUser?.role === 'owner' && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white transition-all">
                <Icon name="Settings" size={16} className="mr-2" />
                <span className="hidden sm:inline">Админ</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="home" className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-primary via-secondary to-accent rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4">Добро пожаловать на платформу голосований! 🗳️</h2>
                <p className="text-lg opacity-90 mb-6">Создавайте голосования, участвуйте в опросах и следите за результатами в реальном времени</p>
                <div className="flex gap-4 flex-wrap">
                  <Button 
                    size="lg" 
                    variant="secondary" 
                    className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    onClick={handleOpenCreatePoll}
                  >
                    <Icon name="Plus" size={20} className="mr-2" />
                    Создать голосование
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-2 border-white text-white hover:bg-white/20 hover:scale-105 transition-all"
                    onClick={() => setActiveTab('polls')}
                  >
                    Смотреть все
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Icon name="BarChart" size={24} />
                    {stats.totalPolls}
                  </CardTitle>
                  <CardDescription>Всего голосований</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Icon name="CheckCircle" size={24} />
                    {stats.activePolls}
                  </CardTitle>
                  <CardDescription>Активных голосований</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Icon name="Users" size={24} />
                    {stats.totalVotes}
                  </CardTitle>
                  <CardDescription>Всего голосов</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800 hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <Icon name="Vote" size={24} />
                    {stats.myVotes}
                  </CardTitle>
                  <CardDescription>Мои голосования</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4">Последние голосования</h3>
              {loading ? (
                <LoadingSkeleton />
              ) : polls.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {polls.slice(0, 2).map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-xl font-semibold mb-2">Пока нет активных голосований</p>
                  <p className="text-muted-foreground mb-6">Станьте первым, кто создаст голосование!</p>
                  <Button 
                    className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    onClick={handleOpenCreatePoll}
                  >
                    <Icon name="Plus" size={16} className="mr-2" />
                    Создать первое голосование
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="polls" className="animate-fade-in">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold">Все голосования</h2>
                <Button 
                  className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl transition-all"
                  onClick={loadPolls}
                  disabled={loading}
                >
                  <Icon name={loading ? "Loader2" : "RefreshCw"} size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
              </div>

              {/* Filters and Search */}
              <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Поиск</label>
                      <div className="relative">
                        <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Поиск по названию..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Фильтр</label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="active">Активные</SelectItem>
                          <SelectItem value="closed">Завершенные</SelectItem>
                          <SelectItem value="my_votes">Мои голосования</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Сортировка</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Новые</SelectItem>
                          <SelectItem value="popular">Популярные</SelectItem>
                          <SelectItem value="alphabetical">По алфавиту</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                Найдено голосований: {filteredAndSortedPolls.length}
              </div>

              {/* Polls grid */}
              {loading ? (
                <LoadingSkeleton />
              ) : filteredAndSortedPolls.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                  {filteredAndSortedPolls.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-xl font-semibold mb-2">Голосования не найдены</p>
                  <p className="text-muted-foreground mb-6">Попробуйте изменить фильтры или создайте новое голосование</p>
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery('')} className="mr-2">
                      Очистить поиск
                    </Button>
                  )}
                  <Button 
                    className="bg-gradient-to-r from-primary to-secondary text-white"
                    onClick={handleOpenCreatePoll}
                  >
                    <Icon name="Plus" size={16} className="mr-2" />
                    Создать голосование
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="create" className="animate-fade-in">
            <Card className="max-w-2xl mx-auto shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Создать новое голосование
                </CardTitle>
                <CardDescription>Заполните форму для создания нового опроса</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Icon name="Plus" size={40} className="text-white" />
                  </div>
                  {currentUser ? (
                    <>
                      <p className="text-muted-foreground mb-4">Нажмите кнопку ниже для создания голосования</p>
                      <Button
                        className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                        onClick={handleOpenCreatePoll}
                      >
                        <Icon name="Plus" size={16} className="mr-2" />
                        Создать голосование
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-4">Войдите в систему для создания голосования</p>
                      <Button
                        className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                        onClick={() => setAuthModalOpen(true)}
                      >
                        <Icon name="LogIn" size={16} className="mr-2" />
                        Войти
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="animate-fade-in">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Результаты голосований</h2>
              {loading ? (
                <LoadingSkeleton />
              ) : polls.length > 0 ? (
                <div className="grid gap-6">
                  {polls.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-xl font-semibold mb-2">Нет результатов для отображения</p>
                  <p className="text-muted-foreground">Создайте первое голосование!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            <Card className="max-w-2xl mx-auto shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Профиль пользователя
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentUser ? (
                  <>
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-20 h-20 ring-4 ring-primary/20">
                        <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white text-2xl">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold">{currentUser.name}</h3>
                        <p className="text-muted-foreground">{currentUser.phone}</p>
                        <Badge className="mt-2 bg-gradient-to-r from-primary to-secondary text-white">
                          {currentUser.role.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid gap-4 pt-4 border-t">
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium flex items-center gap-2">
                          <Icon name="BarChart" size={18} />
                          Доступных голосований:
                        </span>
                        <Badge variant="secondary">{polls.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium flex items-center gap-2">
                          <Icon name="Vote" size={18} />
                          Мои голосования:
                        </span>
                        <Badge variant="secondary">{userVotes.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium flex items-center gap-2">
                          <Icon name="User" size={18} />
                          ID пользователя:
                        </span>
                        <Badge variant="secondary">{currentUser.id}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full hover:border-destructive hover:text-destructive transition-all"
                      onClick={handleLogout}
                    >
                      <Icon name="LogOut" size={16} className="mr-2" />
                      Выйти из системы
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Icon name="User" size={40} className="text-white" />
                    </div>
                    <p className="text-muted-foreground mb-4">Войдите в систему для просмотра профиля</p>
                    <Button
                      className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                      onClick={() => setAuthModalOpen(true)}
                    >
                      <Icon name="LogIn" size={16} className="mr-2" />
                      Войти
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {currentUser?.role === 'owner' && (
            <TabsContent value="admin" className="animate-fade-in">
              <div className="space-y-6">
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
                      <Icon name="Shield" size={24} />
                      Панель администратора
                    </CardTitle>
                    <CardDescription>Управление платформой и пользователями</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                        <CardHeader>
                          <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <Icon name="BarChart" size={20} />
                            {stats.totalPolls}
                          </CardTitle>
                          <CardDescription>Всего голосований</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                        <CardHeader>
                          <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                            <Icon name="Users" size={20} />
                            {stats.totalVotes}
                          </CardTitle>
                          <CardDescription>Всего голосов</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                        <CardHeader>
                          <CardTitle className="text-purple-700 dark:text-purple-300 flex items-center gap-2">
                            <Icon name="CheckCircle" size={20} />
                            {stats.activePolls}
                          </CardTitle>
                          <CardDescription>Активных голосований</CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                {/* Polls Management Table */}
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="Database" size={20} />
                      Управление голосованиями
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-12">
                        <Icon name="Loader2" size={48} className="mx-auto animate-spin text-primary" />
                      </div>
                    ) : polls.length > 0 ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Название</TableHead>
                              <TableHead>Создатель</TableHead>
                              <TableHead>Статус</TableHead>
                              <TableHead>Голосов</TableHead>
                              <TableHead>Дата создания</TableHead>
                              <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {polls.map((poll) => (
                              <TableRow key={poll.id}>
                                <TableCell className="font-medium">{poll.title}</TableCell>
                                <TableCell>{poll.creator || poll.creator_name || 'Неизвестно'}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={poll.status === 'active' ? 'default' : 'secondary'}
                                    className={poll.status === 'active' 
                                      ? 'bg-green-500' 
                                      : 'bg-gray-500'}
                                  >
                                    {poll.status === 'active' ? 'Активно' : 'Завершено'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{poll.totalVotes}</TableCell>
                                <TableCell>{formatDate(poll.created_at)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setActiveTab('polls');
                                        setTimeout(() => {
                                          const pollElement = document.getElementById(`poll-${poll.id}`);
                                          pollElement?.scrollIntoView({ behavior: 'smooth' });
                                        }, 100);
                                      }}
                                      title="Просмотр"
                                    >
                                      <Icon name="Eye" size={14} />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openStatusChangeDialog(poll)}
                                      title={poll.status === 'active' ? 'Закрыть' : 'Открыть'}
                                    >
                                      <Icon name={poll.status === 'active' ? 'Lock' : 'Unlock'} size={14} />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => openDeleteDialog(poll.id)}
                                      title="Удалить"
                                    >
                                      <Icon name="Trash2" size={14} />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Icon name="Database" size={48} className="mx-auto mb-4 text-primary" />
                        <p>Нет голосований для управления</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить это голосование? Это действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => pollToDelete && handleDeletePoll(pollToDelete)}
            >
              <Icon name="Trash2" size={16} className="mr-2" />
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pollToChangeStatus?.status === 'active' ? 'Закрыть голосование?' : 'Открыть голосование?'}
            </DialogTitle>
            <DialogDescription>
              {pollToChangeStatus?.status === 'active' 
                ? 'Пользователи больше не смогут голосовать в этом опросе.'
                : 'Пользователи снова смогут голосовать в этом опросе.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={() => pollToChangeStatus && handleTogglePollStatus(pollToChangeStatus.id, pollToChangeStatus.status)}
              className="bg-gradient-to-r from-primary to-secondary text-white"
            >
              <Icon name={pollToChangeStatus?.status === 'active' ? 'Lock' : 'Unlock'} size={16} className="mr-2" />
              {pollToChangeStatus?.status === 'active' ? 'Закрыть' : 'Открыть'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {currentUser && (
        <CreatePollModal
          open={createPollModalOpen}
          onClose={() => setCreatePollModalOpen(false)}
          onSuccess={handleCreatePollSuccess}
          userId={currentUser.id}
          userRole={currentUser.role}
        />
      )}
    </div>
  );
};

export default Index;