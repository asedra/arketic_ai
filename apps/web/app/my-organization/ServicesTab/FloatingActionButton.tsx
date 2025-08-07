"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function FloatingActionButton() {
  /** NEW **/ // Handle FAB click
  const handleClick = () => {
    toast.info("Wizard coming soon")
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
        onClick={handleClick}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}