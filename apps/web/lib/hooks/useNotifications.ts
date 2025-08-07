import { useCallback } from 'react'
import { toast } from 'sonner'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

export function useNotifications() {
  const showNotification = useCallback((
    message: string,
    type: NotificationType = 'info',
    options?: {
      duration?: number
      action?: {
        label: string
        onClick: () => void
      }
    }
  ) => {
    const { duration = 4000, action } = options || {}
    
    const toastOptions = {
      duration,
      action: action ? {
        label: action.label,
        onClick: action.onClick
      } : undefined
    }
    
    switch (type) {
      case 'success':
        toast.success(message, toastOptions)
        break
      case 'error':
        toast.error(message, toastOptions)
        break
      case 'warning':
        toast.warning(message, toastOptions)
        break
      case 'info':
      default:
        toast.info(message, toastOptions)
        break
    }
  }, [])
  
  const showSuccess = useCallback((message: string, options?: any) => {
    showNotification(message, 'success', options)
  }, [showNotification])
  
  const showError = useCallback((message: string, options?: any) => {
    showNotification(message, 'error', options)
  }, [showNotification])
  
  const showWarning = useCallback((message: string, options?: any) => {
    showNotification(message, 'warning', options)
  }, [showNotification])
  
  const showInfo = useCallback((message: string, options?: any) => {
    showNotification(message, 'info', options)
  }, [showNotification])
  
  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}
