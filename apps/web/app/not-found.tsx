"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { DelightfulErrorState } from '@/components/ui/delightful-error-state'
import { DelightfulButton } from '@/components/ui/delightful-button'
import { Home, ArrowLeft, Search, Coffee, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// Fun facts about Arketic while users are lost
const funFacts = [
  "Did you know? Arketic helps organizations achieve 90%+ compliance faster!",
  "Fun fact: Our AI processes thousands of documents in seconds!",
  "Cool feature: Arketic can automatically map your org chart!",
  "Did you know? We support over 50 compliance frameworks!",
  "Fun fact: Arketic users save 10+ hours per week on compliance tasks!"
]

// Easter egg: Simple memory game while they wait
function MiniGame() {
  const [sequence, setSequence] = useState<number[]>([])
  const [userSequence, setUserSequence] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [score, setScore] = useState(0)
  const [showSequence, setShowSequence] = useState(false)
  
  const colors = ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400']
  
  const startGame = () => {
    const newSequence = [Math.floor(Math.random() * 4)]
    setSequence(newSequence)
    setUserSequence([])
    setIsPlaying(true)
    setShowSequence(true)
    setScore(0)
    
    setTimeout(() => setShowSequence(false), 1000)
  }
  
  const handleColorClick = (colorIndex: number) => {
    if (!isPlaying || showSequence) return
    
    const newUserSequence = [...userSequence, colorIndex]
    setUserSequence(newUserSequence)
    
    // Check if correct
    if (newUserSequence[newUserSequence.length - 1] !== sequence[newUserSequence.length - 1]) {
      setIsPlaying(false)
      alert(`Game over! Score: ${score}`)
      return
    }
    
    // Check if sequence completed
    if (newUserSequence.length === sequence.length) {
      const newScore = score + 1
      setScore(newScore)
      
      // Add new color to sequence
      const nextSequence = [...sequence, Math.floor(Math.random() * 4)]
      setSequence(nextSequence)
      setUserSequence([])
      setShowSequence(true)
      
      setTimeout(() => setShowSequence(false), 1000 + nextSequence.length * 200)
    }
  }
  
  return (
    <div className="text-center space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
      <h4 className="font-medium text-slate-900 dark:text-slate-100">
        Memory Game - Score: {score}
      </h4>
      
      {!isPlaying ? (
        <DelightfulButton onClick={startGame} size="sm" bounce>
          <Sparkles className="h-4 w-4 mr-2" />
          Start Game
        </DelightfulButton>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-w-32 mx-auto">
          {colors.map((color, index) => (
            <button
              key={index}
              onClick={() => handleColorClick(index)}
              className={cn(
                "w-12 h-12 rounded-lg transition-all duration-200",
                color,
                showSequence && sequence.includes(index) ? "animate-pulse scale-110" : "",
                "hover:scale-105 active:scale-95"
              )}
            />
          ))}
        </div>
      )}
      
      {isPlaying && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {showSequence ? "Watch the sequence!" : "Repeat the pattern"}
        </p>
      )}
    </div>
  )
}

export default function NotFound() {
  const [currentFact, setCurrentFact] = useState(0)
  const [showEasterEgg, setShowEasterEgg] = useState(false)
  const [konami, setKonami] = useState<string[]>([])
  
  // Rotate fun facts every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % funFacts.length)
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Konami code easter egg (up, up, down, down, left, right, left, right)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key
      const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight']
      
      setKonami(prev => {
        const newKonami = [...prev, key].slice(-8)
        
        if (JSON.stringify(newKonami) === JSON.stringify(konamiCode)) {
          setShowEasterEgg(true)
          return []
        }
        
        return newKonami
      })
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <DelightfulErrorState
          type="404"
          title="Oops! This page went on an adventure"
          description="Looks like this page decided to explore the digital cosmos. While it's out there, why not explore what we have here?"
          actionLabel="Take me home"
          secondaryActionLabel="Go back"
          onAction={() => window.location.href = '/'}
          onSecondaryAction={() => window.history.back()}
          className="mb-8"
        />
        
        {/* Fun fact rotation */}
        <div className="text-center mb-6">
          <div className={cn(
            "inline-flex items-center space-x-2 px-4 py-2 rounded-full",
            "bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm",
            "border border-blue-200/50 dark:border-blue-800/50",
            "animate-fade-in-scale"
          )}>
            <Coffee className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {funFacts[currentFact]}
            </span>
          </div>
        </div>
        
        {/* Quick navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Link href="/">
            <DelightfulButton variant="outline" size="sm" ripple>
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </DelightfulButton>
          </Link>
          
          <Link href="/knowledge">
            <DelightfulButton variant="outline" size="sm" ripple>
              <Search className="h-4 w-4 mr-2" />
              Knowledge
            </DelightfulButton>
          </Link>
          
          <Link href="/my-organization">
            <DelightfulButton variant="outline" size="sm" ripple>
              <Sparkles className="h-4 w-4 mr-2" />
              Organization
            </DelightfulButton>
          </Link>
        </div>
        
        {/* Easter egg game */}
        {showEasterEgg && (
          <div className="animate-slide-in-up">
            <MiniGame />
          </div>
        )}
        
        {/* Secret hint */}
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Psst... try the arrow keys for a surprise! ↑↑↓↓←→←→
          </p>
        </div>
      </div>
      
      {/* Floating particles for ambiance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-blue-300/20 dark:bg-blue-600/20 rounded-full animate-float"
            style={{
              left: `${10 + i * 10}%`,
              top: `${20 + (i % 3) * 30}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + i % 3}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}