import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import axios from "../libs/axios";

export const useTaskStore = create((set) => ({
    tasks: null,
    loading: false,
    actionLoading: false,
    getAllTasks: async () => {
        set({ loading: true });
        try {
            const res = await axios.get('/tasks');
            set({ tasks: res.data.tasks || [], loading: false });
        } catch (error) {
            set({ loading: false });
            console.log('getAllTasks error:', error.response?.status, error.response?.data);
            if (error.response?.status !== 401) {
                toast.error(error.response.data?.error || "An error occurred");
            }
        }
    },
    getTasksByUserId: async (id) => {
        set({ loading: true });
        try {
            const res = await axios.get(`/tasks/${id}`);
            set({ tasks: res.data.tasks || [], loading: false });
        } catch (error) {
            set({ loading: false });
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
    createTask: async (id, taskData) => {
        set({ actionLoading: true });
        try {
            const res =await axios.post(`/tasks/create/${id}`, taskData);
            set((state) => {
                const existingTasks = Array.isArray(state.tasks) ? state.tasks : [];
                const newTask = res.data?.task;
                return {
                    tasks: newTask ? [...existingTasks, newTask] : existingTasks,
                    actionLoading: false
                };
            });
            toast.success("Task created successfully");
        } catch (error) {
            set({ actionLoading: false });
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
    updateTask: async (id, taskData) => {
        set({ actionLoading: true });
        try {
            const res = await axios.post(`/tasks/${id}`, taskData);
            set((state) => ({
                actionLoading: false,
                tasks: Array.isArray(state.tasks)
                    ? state.tasks.map(task => {
                        if (task.id !== id) return task;
                        const updatedTask = res.data?.task;
                        return updatedTask ? { ...task, ...updatedTask } : { ...task, ...taskData };
                      })
                    : state.tasks
            }));
            toast.success("Task updated successfully");
        } catch (error) {
            set({ actionLoading: false });
            console.log(error)
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
    changeTaskStatus: async (id, status) => {
        set({ actionLoading: true });
        try {
            const res = await axios.post(`/tasks/${id}/status`, { status });
            const updatedTask = res.data?.task;

            set((state) => ({
                tasks: Array.isArray(state.tasks)
                    ? state.tasks.map(task => {
                        if (task.id !== id) return task;
                        if (updatedTask) {
                            return { ...task, ...updatedTask };
                        }
                        return { ...task, status };
                    })
                    : state.tasks,
                actionLoading: false
            }));

            toast.success("Task status updated successfully");
        } catch (error) {
            set({ actionLoading: false });
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
    togglePinTask: async (id) => {
        set({ actionLoading: true });
        try {
            const res = await axios.post(`/tasks/${id}/pin`);
            set((state) => ({
                tasks: Array.isArray(state.tasks)
                    ? state.tasks.map(task => task.id === id ? res.data.task : task)
                    : state.tasks,
                actionLoading: false
            }));
            toast.success("Task pin status updated");
        } catch (error) {
            set({ actionLoading: false });
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
    deleteTask: async (id) => {
        set({ actionLoading: true });
        try {
            await axios.delete(`/tasks/${id}`);
            
            set((state) => ({
                tasks: Array.isArray(state.tasks)
                    ? state.tasks.filter(task => task.id !== id)
                    : state.tasks,
                actionLoading: false
            }));

            toast.success("Task deleted successfully");
        } catch (error) {
            set({ actionLoading: false });
            toast.error(error.response.data?.error || "An error occurred");
        }
    }
}))
