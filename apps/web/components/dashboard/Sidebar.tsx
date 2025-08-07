import React, { memo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Bot,
  Workflow,
  Database,
  Settings,
  User,
  BarChart3,
  FileText,
  Users,
  ClipboardList
} from 'lucide-react'
import { useNavigation } from '@/lib/hooks'
import { useAuth } from '@/lib/auth-context'
import { TokenExpiryIndicator } from '@/components/auth/token-expiry-indicator'
import type { Section } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

interface NavigationItem {
  id: Section
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const navigationItems: NavigationItem[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3
  },
  {
    id: 'chat',
    label: 'AI Chat',
    icon: Bot
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: FileText
  },
  {
    id: 'forms',
    label: 'Forms',
    icon: ClipboardList
  },
  {
    id: 'assistants',
    label: 'Assistants',
    icon: Bot
  },
  {
    id: 'my-organization',
    label: 'My Organization',
    icon: Users
  },
  {
    id: 'workflow',
    label: 'Workflow',
    icon: Workflow
  },
  {
    id: 'data-sources',
    label: 'Data Sources',
    icon: Database
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings
  }
]

// User Profile Component
const UserProfile = memo(function UserProfile() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        className="w-full justify-start text-white hover:bg-white/10 dark:hover:bg-white/5 gap-3 h-10 px-4 rounded-lg"
      >
        <User className="h-4 w-4" />
        <span className="text-sm truncate">
          {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email || 'Profile'}
        </span>
      </Button>
      
      <Button
        variant="ghost"
        onClick={handleLogout}
        className="w-full justify-start text-slate-300 hover:bg-red-500/10 hover:text-red-300 gap-3 h-8 px-4 rounded-lg text-xs transition-colors"
      >
        Sign Out
      </Button>
    </div>
  )
})

export const Sidebar = memo(function Sidebar({ className }: SidebarProps) {
  const { activeSection, navigateToSection, isActiveSection } = useNavigation()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className={cn(
      "w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col text-white border-r border-slate-700 dark:border-slate-800/50",
      className
    )}>
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
            C
          </div>
          <div>
            <span className="font-bold text-lg text-white">Arketic</span>
            <div className="text-xs text-slate-400 dark:text-slate-500">AI Platform</div>
          </div>
        </div>
        {/* Token Expiry Indicator */}
        <div className="flex justify-end">
          <TokenExpiryIndicator />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-4 mb-6">
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-white/10 dark:hover:bg-white/5 gap-3 h-11 px-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 dark:border-blue-400/30"
          onClick={() => router.push('/chat')}
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">New Chat</span>
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 space-y-1">
        {/* AI Chat Section */}
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          AI Chat
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-white/10 dark:hover:bg-white/5 gap-3 h-10 px-4 rounded-lg transition-all duration-200",
            pathname === '/chat' && "bg-blue-600/20 text-blue-300 border-r-2 border-blue-400"
          )}
          onClick={() => router.push('/chat')}
        >
          <Bot className="h-4 w-4" />
          <span className="text-sm">All Chats</span>
        </Button>

        {/* Main Navigation */}
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-6">
          Platform
        </div>
        
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = item.id === 'chat' ? pathname === '/chat' : isActiveSection(item.id)
          
          const handleNavigation = () => {
            if (item.id === 'chat') {
              router.push('/chat')
            } else {
              navigateToSection(item.id)
            }
          }
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start text-white hover:bg-white/10 dark:hover:bg-white/5 gap-3 h-10 px-4 rounded-lg transition-all duration-200",
                isActive && "bg-blue-600/20 text-blue-300 border-r-2 border-blue-400"
              )}
              onClick={handleNavigation}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto h-5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </Button>
          )
        })}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700 dark:border-slate-800">
        <UserProfile />
      </div>
    </div>
  )
})
