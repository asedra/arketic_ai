import { useCallback } from 'react'
import { useArketicStore } from '../state-manager'
import type { Section } from '../types'

export function useNavigation() {
  const activeTab = useArketicStore(state => state.activeTab)
  const setActiveTab = useArketicStore(state => state.setActiveTab)
  
  const navigateToSection = useCallback((section: Section) => {
    setActiveTab(section)
    
    // Track navigation for analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: section,
        page_location: window.location.href
      })
    }
  }, [setActiveTab])
  
  const isActiveSection = useCallback((section: Section) => {
    return activeTab === section
  }, [activeTab])
  
  return {
    activeSection: activeTab as Section,
    navigateToSection,
    isActiveSection
  }
}
