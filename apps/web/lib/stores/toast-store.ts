import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  
  addToast: (toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    const newToast: Toast = { ...toast, id }
    
    set(state => ({
      toasts: [...state.toasts, newToast]
    }))
    
    // Auto remove after duration (default 5 seconds)
    if (toast.duration !== 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, toast.duration || 5000)
    }
    
    return id
  },
  
  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }))
  },
  
  clearToasts: () => {
    set({ toasts: [] })
  }
}))

// Helper functions for common toast types
export const toast = {
  success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    const store = useToastStore.getState()
    return store.addToast({ ...options, type: 'success', message })
  },
  
  error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    const store = useToastStore.getState()
    return store.addToast({ ...options, type: 'error', message })
  },
  
  warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    const store = useToastStore.getState()
    return store.addToast({ ...options, type: 'warning', message })
  },
  
  info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    const store = useToastStore.getState()
    return store.addToast({ ...options, type: 'info', message })
  }
}