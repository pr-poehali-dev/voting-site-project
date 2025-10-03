import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
}

interface User {
  id: number;
  phone: string;
  name: string;
  role: string;
}

const Index = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createPollModalOpen, setCreatePollModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check authentication on page load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to parse user from localStorage', error);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
      }
    }
  }, []);

  // Load polls from API
  const loadPolls = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/0b3cf8f7-e77c-4ff3-9d11-4aae9401ce7c');
      const data = await response.json();
      
      if (data.success && data.polls) {
        // Transform polls to include totalVotes
        const transformedPolls = data.polls.map((poll: any) => ({
          ...poll,
          totalVotes: poll.options.reduce((sum: number, opt: PollOption) => sum + opt.votes_count, 0)
        }));
        setPolls(transformedPolls);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить голосования',
        variant: 'destructive'
      });
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
        // Reload polls to get updated counts
        loadPolls();
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

    if (!confirm('Вы уверены, что хотите удалить это голосование?')) {
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

  // Handle authentication success
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    loadPolls(); // Reload polls after login
  };

  // Handle create poll success
  const handleCreatePollSuccess = () => {
    loadPolls(); // Reload polls after creating new one
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
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

  const PollCard = ({ poll }: { poll: Poll }) => {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isVoting, setIsVoting] = useState(false);

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

    return (
      <Card className="hover:shadow-lg transition-all duration-300 animate-scale-in border-2 hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {poll.title}
              </CardTitle>
              <CardDescription>{poll.description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-gradient-to-r from-primary to-secondary text-white">
                {poll.status === 'active' ? 'Активно' : 'Завершено'}
              </Badge>
              {currentUser?.role === 'owner' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePoll(poll.id)}
                  className="h-6 px-2"
                >
                  <Icon name="Trash2" size={14} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {poll.options.map((option) => {
            const percentage = poll.totalVotes > 0 ? (option.votes_count / poll.totalVotes) * 100 : 0;
            const isSelected = selectedOption === option.id;
            
            return (
              <div 
                key={option.id} 
                className={`space-y-2 animate-fade-in cursor-pointer p-2 rounded-lg transition-colors ${
                  isSelected ? 'bg-primary/10 border-2 border-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedOption(option.id)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{option.option_text}</span>
                  <span className="text-sm text-muted-foreground">{option.votes_count} голосов</span>
                </div>
                <div className="relative">
                  <Progress value={percentage} className="h-3" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-primary-foreground mix-blend-difference">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">Всего голосов: {poll.totalVotes}</span>
            <Button 
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
              onClick={handleVoteClick}
              disabled={isVoting || poll.status !== 'active'}
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
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <Icon name="Vote" size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Голосование.pу</h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser ? (
                <>
                  <Avatar className="cursor-pointer" onClick={() => setActiveTab('profile')}>
                    <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <Badge variant="outline" className="text-xs">{currentUser.role}</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <Icon name="LogOut" size={16} className="mr-2" />
                    Выход
                  </Button>
                </>
              ) : (
                <Button 
                  className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
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
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid bg-white/80 backdrop-blur-sm p-1">
            <TabsTrigger value="home" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white">
              <Icon name="Home" size={16} className="mr-2" />
              <span className="hidden sm:inline">Главная</span>
            </TabsTrigger>
            <TabsTrigger value="polls" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white">
              <Icon name="BarChart" size={16} className="mr-2" />
              <span className="hidden sm:inline">Голосования</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white">
              <Icon name="Plus" size={16} className="mr-2" />
              <span className="hidden sm:inline">Создать</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white">
              <Icon name="TrendingUp" size={16} className="mr-2" />
              <span className="hidden sm:inline">Результаты</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white">
              <Icon name="User" size={16} className="mr-2" />
              <span className="hidden sm:inline">Профиль</span>
            </TabsTrigger>
            {currentUser?.role === 'owner' && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white">
                <Icon name="Settings" size={16} className="mr-2" />
                <span className="hidden sm:inline">Админ</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="home" className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white shadow-xl">
              <h2 className="text-3xl font-bold mb-4">Добро пожаловать на платформу голосований!</h2>
              <p className="text-lg opacity-90 mb-6">Создавайте голосования, участвуйте в опросах и следите за результатами в реальном времени</p>
              <div className="flex gap-4 flex-wrap">
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={handleOpenCreatePoll}
                >
                  <Icon name="Plus" size={20} className="mr-2" />
                  Создать голосование
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Узнать больше
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Vote" size={24} className="text-primary" />
                    {polls.length}
                  </CardTitle>
                  <CardDescription>Активных голосований</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Users" size={24} className="text-secondary" />
                    {polls.reduce((acc, poll) => acc + poll.totalVotes, 0)}
                  </CardTitle>
                  <CardDescription>Всего голосов</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="TrendingUp" size={24} className="text-accent" />
                    100%
                  </CardTitle>
                  <CardDescription>Активность сообщества</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4">Последние голосования</h3>
              {loading ? (
                <div className="text-center py-12">
                  <Icon name="Loader2" size={48} className="mx-auto animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">Загрузка голосований...</p>
                </div>
              ) : polls.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {polls.slice(0, 2).map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Vote" size={48} className="mx-auto mb-4 text-primary" />
                  <p>Пока нет активных голосований</p>
                  <Button 
                    className="mt-4 bg-gradient-to-r from-primary to-secondary text-white"
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
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Все голосования</h2>
                <Button 
                  className="bg-gradient-to-r from-primary to-secondary text-white"
                  onClick={loadPolls}
                  disabled={loading}
                >
                  <Icon name={loading ? "Loader2" : "RefreshCw"} size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
              </div>
              {loading ? (
                <div className="text-center py-12">
                  <Icon name="Loader2" size={48} className="mx-auto animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">Загрузка голосований...</p>
                </div>
              ) : polls.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                  {polls.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Vote" size={48} className="mx-auto mb-4 text-primary" />
                  <p>Нет доступных голосований</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="create" className="animate-fade-in">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Создать новое голосование
                </CardTitle>
                <CardDescription>Заполните форму для создания нового опроса</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-12">
                  <Icon name="Plus" size={48} className="mx-auto mb-4 text-primary" />
                  {currentUser ? (
                    <>
                      <p className="text-muted-foreground mb-4">Нажмите кнопку ниже для создания голосования</p>
                      <Button
                        className="bg-gradient-to-r from-primary to-secondary text-white"
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
                        className="bg-gradient-to-r from-primary to-secondary text-white"
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
                <div className="text-center py-12">
                  <Icon name="Loader2" size={48} className="mx-auto animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">Загрузка результатов...</p>
                </div>
              ) : polls.length > 0 ? (
                <div className="grid gap-6">
                  {polls.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="BarChart" size={48} className="mx-auto mb-4 text-primary" />
                  <p>Нет результатов для отображения</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Профиль пользователя
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentUser ? (
                  <>
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-20 h-20">
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
                      <div className="flex justify-between">
                        <span className="font-medium">Доступных голосований:</span>
                        <span>{polls.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">ID пользователя:</span>
                        <span>{currentUser.id}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLogout}
                    >
                      <Icon name="LogOut" size={16} className="mr-2" />
                      Выйти из системы
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Icon name="User" size={48} className="mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground mb-4">Войдите в систему для просмотра профиля</p>
                    <Button
                      className="bg-gradient-to-r from-primary to-secondary text-white"
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-2">
                    <Icon name="Shield" size={24} />
                    Панель администратора
                  </CardTitle>
                  <CardDescription>Управление платформой и пользователями</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="h-24 flex-col gap-2 border-2 hover:border-primary">
                      <Icon name="Users" size={32} className="text-primary" />
                      Управление пользователями
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-24 flex-col gap-2 border-2 hover:border-primary"
                      onClick={() => setActiveTab('polls')}
                    >
                      <Icon name="BarChart" size={32} className="text-primary" />
                      Управление голосованиями
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2 border-2 hover:border-primary">
                      <Icon name="Settings" size={32} className="text-primary" />
                      Настройки платформы
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-24 flex-col gap-2 border-2 hover:border-primary"
                      onClick={() => setActiveTab('results')}
                    >
                      <Icon name="FileText" size={32} className="text-primary" />
                      Отчеты и статистика
                    </Button>
                  </div>
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-2">Статистика платформы:</h3>
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Всего голосований:</span>
                        <span className="font-medium">{polls.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Всего голосов:</span>
                        <span className="font-medium">{polls.reduce((acc, poll) => acc + poll.totalVotes, 0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

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