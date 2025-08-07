"use client"

import { useState } from "react"
import { ChevronRight, Globe, Users, BarChart3, Settings, MessageSquare } from "lucide-react"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

interface DirectoryTreeProps {
  className?: string
}

export function DirectoryTree({ className }: DirectoryTreeProps) {
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set(['main-office', 'branch-office']))
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set())

  const toggleSite = (siteId: string) => {
    const newExpanded = new Set(expandedSites)
    if (newExpanded.has(siteId)) {
      newExpanded.delete(siteId)
    } else {
      newExpanded.add(siteId)
    }
    setExpandedSites(newExpanded)
  }

  const toggleDepartment = (deptId: string) => {
    const newExpanded = new Set(expandedDepartments)
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId)
    } else {
      newExpanded.add(deptId)
    }
    setExpandedDepartments(newExpanded)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main Office */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          onClick={() => toggleSite('main-office')}
        >
          <div className="flex items-center gap-3">
            <ChevronRight 
              className={`h-4 w-4 text-slate-500 transition-transform ${
                expandedSites.has('main-office') ? 'rotate-90' : ''
              }`} 
            />
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Globe className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Main Office</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">New York, NY • 3 departments • 18 users</p>
            </div>
          </div>
          <Badge variant="secondary">Active</Badge>
        </div>
        
        {expandedSites.has('main-office') && (
          <div className="border-t border-slate-200 dark:border-slate-700">
            {/* Engineering Department */}
            <div className="ml-6">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleDepartment('main-engineering')}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight 
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      expandedDepartments.has('main-engineering') ? 'rotate-90' : ''
                    }`} 
                  />
                  <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                    <Users className="h-3 w-3 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Engineering</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">12 users • Development and technical operations</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              
              {expandedDepartments.has('main-engineering') && (
                <div className="ml-6 space-y-2 p-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="John Doe" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        JD
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">John Doe</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">john@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">Admin</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Mike Johnson" />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs">
                        MJ
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Mike Johnson</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">mike@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">Admin</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Emma Davis" />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs">
                        ED
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Emma Davis</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">emma@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 pl-9">+9 more Engineering users</span>
                </div>
              )}
            </div>

            {/* Sales Department */}
            <div className="ml-6">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleDepartment('main-sales')}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight 
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      expandedDepartments.has('main-sales') ? 'rotate-90' : ''
                    }`} 
                  />
                  <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <BarChart3 className="h-3 w-3 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Sales</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">4 users • Sales and customer management</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              
              {expandedDepartments.has('main-sales') && (
                <div className="ml-6 space-y-2 p-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Jane Smith" />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs">
                        JS
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Jane Smith</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">jane@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">Admin</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Sarah Wilson" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        SW
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Sarah Wilson</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">sarah@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Maria Garcia" />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs">
                        MG
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Maria Garcia</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">maria@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Tom Brown" />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-xs">
                        TB
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Tom Brown</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">tom@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Support Department */}
            <div className="ml-6">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleDepartment('main-support')}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight 
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      expandedDepartments.has('main-support') ? 'rotate-90' : ''
                    }`} 
                  />
                  <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-900/50 flex items-center justify-center">
                    <Settings className="h-3 w-3 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Support</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">2 users • Customer support and help desk</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              
              {expandedDepartments.has('main-support') && (
                <div className="ml-6 space-y-2 p-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Kevin Johnson" />
                      <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-700 text-white text-xs">
                        KJ
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Kevin Johnson</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">kevin@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Mark Wilson" />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white text-xs">
                        MW
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Mark Wilson</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">mark@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Branch Office */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          onClick={() => toggleSite('branch-office')}
        >
          <div className="flex items-center gap-3">
            <ChevronRight 
              className={`h-4 w-4 text-slate-500 transition-transform ${
                expandedSites.has('branch-office') ? 'rotate-90' : ''
              }`} 
            />
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <Globe className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Branch Office</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">San Francisco, CA • 2 departments • 12 users</p>
            </div>
          </div>
          <Badge variant="secondary">Active</Badge>
        </div>
        
        {expandedSites.has('branch-office') && (
          <div className="border-t border-slate-200 dark:border-slate-700">
            {/* Sales Department */}
            <div className="ml-6">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleDepartment('branch-sales')}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight 
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      expandedDepartments.has('branch-sales') ? 'rotate-90' : ''
                    }`} 
                  />
                  <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <BarChart3 className="h-3 w-3 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Sales</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">4 users • Sales and customer management</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              
              {expandedDepartments.has('branch-sales') && (
                <div className="ml-6 space-y-2 p-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Alex Chen" />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs">
                        AC
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Alex Chen</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">alex@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="David Kim" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        DK
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">David Kim</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">david@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Lisa Park" />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs">
                        LP
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Lisa Park</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">lisa@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Tom Brown" />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-xs">
                        TB
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Tom Brown</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">tom@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Marketing Department */}
            <div className="ml-6">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleDepartment('branch-marketing')}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight 
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      expandedDepartments.has('branch-marketing') ? 'rotate-90' : ''
                    }`} 
                  />
                  <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <MessageSquare className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Marketing</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">8 users • Marketing and content creation</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              
              {expandedDepartments.has('branch-marketing') && (
                <div className="ml-6 space-y-2 p-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="David Kim" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        DK
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">David Kim</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">david@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Lisa Park" />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs">
                        LP
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Lisa Park</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">lisa@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Tom Brown" />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs">
                        TB
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Tom Brown</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">tom@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Anna White" />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-xs">
                        AW
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Anna White</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">anna@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Chris Taylor" />
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white text-xs">
                        CT
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Chris Taylor</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">chris@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Nina Patel" />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white text-xs">
                        NP
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Nina Patel</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">nina@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Rachel Green" />
                      <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-700 text-white text-xs">
                        RG
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Rachel Green</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">rachel@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 pl-9">+2 more Marketing users</span>
                </div>
              )}
            </div>

            {/* Support Department */}
            <div className="ml-6">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleDepartment('branch-support')}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight 
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      expandedDepartments.has('branch-support') ? 'rotate-90' : ''
                    }`} 
                  />
                  <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-900/50 flex items-center justify-center">
                    <Settings className="h-3 w-3 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Support</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">1 user • Customer support and help desk</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              
              {expandedDepartments.has('branch-support') && (
                <div className="ml-6 space-y-2 p-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Rachel Green" />
                      <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-700 text-white text-xs">
                        RG
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Rachel Green</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">rachel@company.com</p>
                      <Badge variant="outline" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 