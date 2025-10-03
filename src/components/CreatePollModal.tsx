import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface CreatePollModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: number;
  userRole: string;
}

export default function CreatePollModal({ open, onClose, onSuccess, userId, userRole }: CreatePollModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const createPoll = async () => {
    if (!title.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название голосования',
        variant: 'destructive'
      });
      return;
    }

    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast({
        title: 'Ошибка',
        description: 'Добавьте минимум 2 варианта ответа',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/40bcc29c-0772-4614-813b-079d0b6f24f3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId.toString(),
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          options: validOptions
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Успешно!',
          description: 'Голосование создано'
        });
        setTitle('');
        setDescription('');
        setOptions(['', '']);
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось создать голосование',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Проблема с подключением',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Создать новое голосование
          </DialogTitle>
          <DialogDescription>
            Заполните форму для создания опроса
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Название голосования *</Label>
            <Input
              id="title"
              placeholder="Введите вопрос"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Описание (необязательно)</Label>
            <Textarea
              id="description"
              placeholder="Дополнительная информация"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label>Варианты ответов *</Label>
            <div className="space-y-2 mt-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Вариант ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <Icon name="X" size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={addOption}
              className="mt-2 w-full"
            >
              <Icon name="Plus" className="mr-2 h-4 w-4" />
              Добавить вариант
            </Button>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button 
              onClick={createPoll} 
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Icon name="Check" className="mr-2 h-4 w-4" />
                  Создать
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
