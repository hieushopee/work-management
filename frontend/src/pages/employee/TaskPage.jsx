import React, { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle, Circle, PlayCircle, AlertTriangle, Flag, ClipboardList } from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import useUserStore from '../../stores/useUserStore';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/LoadingSpinner';
import Filter from '../../components/Filter';

const TaskPage = () => {
  const { user } = useUserStore()
  const { tasks, getTasksByUserId, changeTaskStatus, togglePinTask, loading, actionLoading } = useTaskStore()

  const safeTasks = useMemo(
    () => (Array.isArray(tasks) ? tasks : []),
    [tasks]
  );

  const [filteredTasks, setFilteredTasks] = useState(safeTasks);

  const normalizeStatus = (status) => {
    const normalized = String(status || '').toLowerCase().replace(/[\s_-]+/g, '');
    switch (normalized) {
      case 'todo':
      case 'doing':
      case 'done':
      case 'late':
        return normalized;
      case 'pending':
      case 'notstarted':
      case 'awaiting':
        return 'todo';
      case 'inprogress':
      case 'progress':
        return 'doing';
      case 'completed':
      case 'complete':
        return 'done';
      default:
        return 'todo';
    }
  };

  const getEffectiveStatus = (task) => {
    const normalized = normalizeStatus(task?.myStatus ?? task?.status);
    if (normalized !== 'done' && task?.deadline && new Date(task.deadline) < new Date()) {
      return 'late';
    }
    return normalized;
  };

  const filterTasks = async (query) => {
    if (query === '') {
      setFilteredTasks(safeTasks);
      return;
    }

    query = await query?.trim().toLowerCase();

    const filtered = safeTasks.filter(task => {
      const effectiveStatus = getEffectiveStatus(task);
      const rawStatus = normalizeStatus(task?.myStatus ?? task?.status);
      const aggregateStatus = normalizeStatus(task?.status);
      return task.name?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        (task.deadline ? task.deadline.toLowerCase().includes(query) : false) ||
        effectiveStatus.includes(query) ||
        rawStatus.includes(query) ||
        aggregateStatus.includes(query);
    });

    setFilteredTasks(filtered);
  }

  useEffect(() => {
    setFilteredTasks(safeTasks)
  }, [safeTasks])

  useEffect(() => {
    if (user?.id) {
      getTasksByUserId(user.id)
    }
  }, [user?.id, getTasksByUserId])

  const getStatusInfo = (status) => {
    switch (status) {
      case 'todo':
        return { color: 'bg-gray-100 text-gray-700', icon: <Circle className="w-4 h-4" />, label: 'To Do' };
      case 'doing':
        return { color: 'bg-blue-100 text-blue-700', icon: <PlayCircle className="w-4 h-4" />, label: 'In Progress' };
      case 'done':
        return { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Completed' };
      case 'late':
        return { color: 'bg-red-100 text-red-700', icon: <AlertTriangle className="w-4 h-4" />, label: 'Late' };
      default:
        return { color: 'bg-gray-100 text-gray-700', icon: <Circle className="w-4 h-4" />, label: 'To Do' };
    }
  }

  const getPriorityInfo = (priority, isPinned) => {
    const icon = <Flag className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />;
    switch (priority) {
      case 'High':
        return { color: 'text-red-500', icon, label: 'High' };
      case 'Medium':
        return { color: 'text-yellow-500', icon, label: 'Medium' };
      case 'Low':
        return { color: 'text-green-500', icon, label: 'Low' };
      default:
        if (isPinned) {
          return { color: 'text-yellow-500', icon, label: 'Important' };
        }
        return { color: 'text-gray-400', icon, label: 'Normal' };
    }
  }

  const sortedTasks = useMemo(() => {
    if (!filteredTasks) return [];
    return [...filteredTasks].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [filteredTasks]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className='space-y-8 bg-white min-h-0'>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">My Tasks</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">To Do</p>
            <div className="p-3 rounded-full bg-gray-100">
              <Circle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {safeTasks.filter(task => getEffectiveStatus(task) === 'todo').length || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">In Progress</p>
            <div className="p-3 rounded-full bg-blue-100">
              <PlayCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {safeTasks.filter(task => getEffectiveStatus(task) === 'doing').length || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {safeTasks.filter(task => getEffectiveStatus(task) === 'done').length || 0}
          </p>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Task List</h2>
          {safeTasks.length > 0 && <Filter onSearch={filterTasks} />}
        </div>

        {sortedTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-28 h-28 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <ClipboardList className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">All tasks completed!</h3>
            <p className="text-gray-500">You currently have no pending tasks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTasks.map((task) => {
              const status = getEffectiveStatus(task);
              const statusInfo = getStatusInfo(status);
              const normalizedRaw = normalizeStatus(task?.myStatus ?? task?.status);
              const priorityInfo = getPriorityInfo(task.priority, task.isPinned);

              return (
                <div key={task.id} className={`bg-white rounded-lg border ${task.isPinned ? 'border-yellow-400' : 'border-gray-200'} shadow-sm hover:shadow-xl transition-all flex flex-col justify-between`}>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                      <span 
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${priorityInfo.color}`}
                        onClick={() => togglePinTask(task.id)}
                      >
                        {priorityInfo.icon}
                        {priorityInfo.label} Task
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-2 truncate">{task.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                    <div className={`flex items-center text-sm p-2 rounded-md ${status === 'late' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className={`${status === 'late' ? 'font-semibold' : ''}`}>
                        Deadline: {formatDate(task.deadline)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    {(normalizedRaw === 'todo') && (
                      <button 
                        onClick={() => changeTaskStatus(task.id, 'doing')} 
                        disabled={actionLoading}
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                        <PlayCircle className="w-5 h-5"/>
                        Start Progress
                      </button>
                    )}
                    {(normalizedRaw === 'doing') && (
                      <button 
                        onClick={() => changeTaskStatus(task.id, 'done')} 
                        disabled={actionLoading}
                        className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                        <CheckCircle className="w-5 h-5"/>
                        Mark as Done
                      </button>
                    )}
                    {(normalizedRaw === 'done') && (
                      <div className="text-center text-sm font-medium text-green-600 flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5"/>
                        Task Completed
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskPage;
