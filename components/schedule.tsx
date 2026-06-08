"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/global';
import { Button } from '@/components/ui/global';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/global';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { Plus, Calendar, Trash2, Pencil, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Schedule {
  id: string;
  date: string;
  list: string[];
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { date: string; events: string[] }) => void;
  initialData?: Schedule;
  mode: 'create' | 'edit';
}

const ScheduleModal = ({ isOpen, onClose, onSubmit, initialData, mode }: ScheduleModalProps) => {
  const [date, setDate] = useState('');
  const [events, setEvents] = useState<string[]>(['']);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setEvents(initialData.list.length ? initialData.list : ['']);
    } else {
      setDate('');
      setEvents(['']);
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredEvents = events.filter(event => event.trim() !== '');
    onSubmit({ date, events: filteredEvents });
    onClose();
  };

  const addEvent = () => {
    setEvents([...events, '']);
  };

  const removeEvent = (index: number) => {
    const newEvents = events.filter((_, i) => i !== index);
    setEvents(newEvents.length ? newEvents : ['']);
  };

  const updateEvent = (index: number, value: string) => {
    const newEvents = [...events];
    newEvents[index] = value;
    setEvents(newEvents);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Evento' : 'Editar Evento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="date">Data (DD/MM)</Label>
            <Input
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="DD/MM"
              required
              pattern="\d{2}/\d{2}"
            />
          </div>
          <div className="space-y-4">
            <Label>Eventos</Label>
            {events.map((event, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={event}
                  onChange={(e) => updateEvent(index, e.target.value)}
                  placeholder="Nome do evento"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEvent(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Evento
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SchedulePage = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    schedule?: Schedule;
  }>({
    isOpen: false,
    mode: 'create'
  });
  
  const { toast } = useToast();
  const API_URL = process.env.API_URL ?? 'https://api-renovada.jbmidia.com';

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/schedule`);
      const data = await response.json();
      setSchedules(data.data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os eventos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(schedules);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    setSchedules(reordered);

    setIsSavingOrder(true);
    try {
      const response = await fetch(`${API_URL}/schedule/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
      });

      if (!response.ok) throw new Error('Failed to reorder');

      toast({ title: 'Sucesso', description: 'Ordem salva com sucesso!' });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a ordem.',
        variant: 'destructive',
      });
      fetchSchedules();
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCreateSchedule = async (data: { date: string; events: string[] }) => {
    try {
      const response = await fetch(`${API_URL}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create schedule');

      toast({
        title: 'Sucesso',
        description: 'Evento criado com sucesso!',
      });
      fetchSchedules();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o evento.',
        variant: 'destructive',
      });
    }
  };

  const handleEditSchedule = async (id: string, data: { date: string; events: string[] }) => {
    try {
      const response = await fetch(`${API_URL}/schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update schedule');

      toast({
        title: 'Sucesso',
        description: 'Evento atualizado com sucesso!',
      });
      fetchSchedules();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o evento.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        const response = await fetch(`${API_URL}/schedule/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete schedule');

        toast({
          title: 'Sucesso',
          description: 'Evento excluído com sucesso!',
        });
        fetchSchedules();
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível excluir o evento.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmit = (data: { date: string; events: string[] }) => {
    if (modalState.mode === 'create') {
      handleCreateSchedule(data);
    } else if (modalState.schedule) {
      handleEditSchedule(modalState.schedule.id, data);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Agenda</h1>
          {isSavingOrder && (
            <span className="text-sm text-black/40 dark:text-white/40 flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white" />
              Salvando ordem...
            </span>
          )}
        </div>
        <Button onClick={() => setModalState({ isOpen: true, mode: 'create' })}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs text-black/40 dark:text-white/40 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-md px-2.5 py-1 select-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
          Arraste para reordenar
        </span>
      </div>

      <ScheduleModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mode: 'create' })}
        onSubmit={handleSubmit}
        initialData={modalState.schedule}
        mode={modalState.mode}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="schedules" direction="vertical">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {schedules.map((schedule, index) => (
                  <Draggable
                    key={schedule.id}
                    draggableId={schedule.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                        }}
                      >
                        <Card
                          className={`transition-shadow select-none ${
                            snapshot.isDragging
                              ? 'shadow-2xl opacity-90 ring-2 ring-primary'
                              : 'hover:shadow-lg'
                          }`}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-4">
                                  <GripVertical className="w-5 h-5 text-black/30 dark:text-white/30 flex-shrink-0" />
                                  <Calendar className="w-5 h-5 text-black/50 dark:text-white/50 flex-shrink-0" />
                                  <h3 className="text-lg font-semibold">{schedule.date}</h3>
                                </div>
                                <ul className="space-y-2">
                                  {schedule.list.map((event, eventIndex) => (
                                    <li key={eventIndex} className="text-black/70 dark:text-white/70">
                                      • {event}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div
                                className="flex flex-col space-y-2 ml-4"
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalState({
                                      isOpen: true,
                                      mode: 'edit',
                                      schedule,
                                    });
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSchedule(schedule.id);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};

export default SchedulePage;