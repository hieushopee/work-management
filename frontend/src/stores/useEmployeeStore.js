import { toast } from 'react-hot-toast';
import { create } from 'zustand';
import axios from "../libs/axios"

export const useEmployeeStore = create((set) => ({
    employees: null,
    loading: false,
    actionLoading: false,
    createEmployee: async ({ name, email, phoneNumber, role, department, teams }) => {
        set({ actionLoading: true });

        try {
            const res = await axios.post('/employees/create', {
                email,
                name,
                phoneNumber,
                role,
                department,
                teams
            });

            if (res.data.success) {
                set((state) =>  ({ employees: [...state.employees, res.data.employee], actionLoading: false }));
                toast.success("Create employee successfully");
            }

        } catch (error) {
            set({ actionLoading: false });
            console.log(error);
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
    getAllEmployees: async () => {
        set({ loading: true });
        try {
            const res = await axios.get('/employees');
            set({ employees: res.data.employees, loading: false });
        } catch (error) {
            set({ loading: false });
            console.log('getAllEmployees error:', error.response?.status, error.response?.data);
            if (error.response?.status !== 401) {
                toast.error(error.response.data?.error || "An error occurred");
            }
        }
    },
    getAllUsers: async () => {
        set({ loading: true });
        try {
            const res = await axios.get('/employees/all');
            set({ employees: res.data.users, loading: false });
        } catch (error) {
            set({ loading: false });
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
    getEmployee: async (id) => {
        set({ loading: true });

        try {
            const res = await axios.get(`/employees/${id}`);
            set({ employee: res.data.employee, loading: false });
            return res.data.employee;
        } catch (error) {
            set({ loading: false });
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
    updateEmployee: async ({ id, email, phoneNumber, name, role, department, teams }) => {
        set({ actionLoading: true });

        try {
            const res = await axios.post(`/employees/${id}`, {
                email,
                phoneNumber,
                name,
                role,
                department,
                teams
            });

            if (res.data.success && res.data.employee) {
                set((state) => ({
                    employees: state.employees.map(employee => employee.id === id ? res.data.employee : employee),
                    actionLoading: false
                }));
                toast.success("Update employee successfully");
            } else {
                // If no employee data returned, refresh all employees to ensure consistency
                try {
                    const refreshRes = await axios.get('/employees/all');
                    set({ employees: refreshRes.data.users, actionLoading: false });
                    toast.success("Update employee successfully");
                } catch (refreshError) {
                    console.error('Failed to refresh employees after update:', refreshError);
                    set({ actionLoading: false });
                    toast.success("Update employee successfully");
                }
            }
        } catch (error) {
            set({ actionLoading: false });
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
    deleteEmployee: async (id) => {
        set({ actionLoading: true });

        try {
            const res = await axios.delete(`/employees/${id}`);
            if (res.data.success) {
                set((state) => ({ employees: state.employees.filter(employee => employee.id !== id), actionLoading: false }));
                toast.success("Delete employee successfully");
            }
        } catch (error) {
            set({ actionLoading: false });
            toast.error(error.response.data?.error || "An error occurred");
        }
    },
}));

export default useEmployeeStore;