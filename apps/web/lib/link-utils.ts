/** NEW **/ // Navigation and highlighting utilities
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

/** NEW **/ // Navigation helper
export const go = (router: AppRouterInstance, target: Record<string, string>) => {
  router.push(`/my-organization?${new URLSearchParams(target)}`)
}

/** NEW **/ // Highlight animation class
export const pulseClass = "animate-[pulse_1.5s_ease-in-out_1] outline outline-2 outline-yellow-400"

/** NEW **/ // Remove highlight after animation
export const removeHighlight = (element: HTMLElement | null) => {
  if (element) {
    setTimeout(() => {
      element.classList.remove(pulseClass)
    }, 1600)
  }
}

/** NEW **/ // Add highlight to element
export const addHighlight = (element: HTMLElement | null) => {
  if (element) {
    element.classList.add(pulseClass)
    removeHighlight(element)
  }
} 