import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';

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
}

interface User {
  email: string;
  name: string;
  role: string;
}

const Index = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser] = useState<User>({
    email: 'snovi6423@gmail.com',
    name: 'Owner',
    role: 'owner'
  });

  useEffect(() => {
    const mockPolls: Poll[] = [
      {
        id: 1,
        title: 'Любимый язык программирования?',
        description: 'Выберите ваш любимый язык для веб-разработки',
        status: 'active',
        options: [
          { id: 1, option_text: 'TypeScript', votes_count: 45 },
          { id: 2, option_text: 'Python', votes_count: 38 },
          { id: 3, option_text: 'JavaScript', votes_count: 52 },
          { id: 4, option_text: 'Go', votes_count: 23 }
        ],
        totalVotes: 158
      },
      {
        id: 2,
        title: 'Лучшее время для встреч команды?',
        description: 'Когда вам удобнее проводить командные встречи?',
        status: 'active',
        options: [
          { id: 5, option_text: 'Утро (9:00-11:00)', votes_count: 28 },
          { id: 6, option_text: 'День (14:00-16:00)', votes_count: 42 },
          { id: 7, option_text: 'Вечер (18:00-20:00)', votes_count: 19 }
        ],
        totalVotes: 89
      },
      {
        id: 3,
        title: 'Новая функция платформы',
        description: 'Какую функцию добавить в первую очередь?',
        status: 'active',
        options: [
          { id: 8, option_text: 'Экспорт результатов в Excel', votes_count: 31 },
          { id: 9, option_text: 'Анонимное голосование', votes_count: 47 },
          { id: 10, option_text: 'Голосование с комментариями', votes_count: 25 },
          { id: 11, option_text: 'Автоматическое закрытие голосований', votes_count: 18 }
        ],
        totalVotes: 121
      }
    ];
    setPolls(mockPolls);
  }, []);

  const PollCard = ({ poll }: { poll: Poll }) => (
    <Card className="hover:shadow-lg transition-all duration-300 animate-scale-in border-2 hover:border-primary/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {poll.title}
            </CardTitle>
            <CardDescription>{poll.description}</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-gradient-to-r from-primary to-secondary text-white">
            {poll.status === 'active' ? 'Активно' : 'Завершено'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {poll.options.map((option) => {
          const percentage = poll.totalVotes > 0 ? (option.votes_count / poll.totalVotes) * 100 : 0;
          return (
            <div key={option.id} className="space-y-2 animate-fade-in">
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
          <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white">
            <Icon name="Vote" size={16} className="mr-2" />
            Голосовать
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <Icon name="Vote" size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                VOTING PLATFORM
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white">
                  {currentUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <Badge variant="outline" className="text-xs">{currentUser.role}</Badge>
              </div>
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
            <TabsTrigger value="admin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white">
              <Icon name="Settings" size={16} className="mr-2" />
              <span className="hidden sm:inline">Админ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white shadow-xl">
              <h2 className="text-3xl font-bold mb-4">Добро пожаловать на платформу голосований!</h2>
              <p className="text-lg opacity-90 mb-6">Создавайте голосования, участвуйте в опросах и следите за результатами в реальном времени</p>
              <div className="flex gap-4 flex-wrap">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
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
              <div className="grid gap-6 md:grid-cols-2">
                {polls.slice(0, 2).map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="polls" className="animate-fade-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Все голосования</h2>
                <Button className="bg-gradient-to-r from-primary to-secondary text-white">
                  <Icon name="Filter" size={16} className="mr-2" />
                  Фильтры
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {polls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
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
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Plus" size={48} className="mx-auto mb-4 text-primary" />
                  <p>Форма создания голосования</p>
                  <p className="text-sm mt-2">Будет добавлена в следующей версии</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="animate-fade-in">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Результаты голосований</h2>
              <div className="grid gap-6">
                {polls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
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
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white text-2xl">
                      {currentUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{currentUser.name}</h3>
                    <p className="text-muted-foreground">{currentUser.email}</p>
                    <Badge className="mt-2 bg-gradient-to-r from-primary to-secondary text-white">
                      {currentUser.role.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Создано голосований:</span>
                    <span>{polls.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Участие в голосованиях:</span>
                    <span>0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Дата регистрации:</span>
                    <span>03.10.2025</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                  <Button variant="outline" className="h-24 flex-col gap-2 border-2 hover:border-primary">
                    <Icon name="BarChart" size={32} className="text-primary" />
                    Управление голосованиями
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 border-2 hover:border-primary">
                    <Icon name="Settings" size={32} className="text-primary" />
                    Настройки платформы
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 border-2 hover:border-primary">
                    <Icon name="FileText" size={32} className="text-primary" />
                    Отчеты и статистика
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;