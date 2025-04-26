"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

export type Entry = {
  date: string
  caloriesIn: number
  caloriesOut: number
  weight?: number
}

// Update the Goal type to include weightUnit
export type Goal = {
  startWeight: number
  targetWeight: number
  startDate: string
  targetDate: string
  startingCalorieDeficit: number
  weightUnit: "lbs" | "kg"
}

// Add conversion functions to the context
export type WeightTrackerContextType = {
  entries: Entry[]
  addEntry: (entry: Entry) => void
  updateEntry: (date: string, updates: Partial<Entry>) => void
  deleteEntry: (date: string) => void
  getNetCalories: (entry: Entry) => number
  weightUnit: string
  goal?: Goal
  setGoal: (goal: Goal) => void
  getExpectedWeightLoss: () => number[]
  getActualWeights: () => { date: string; weight: number }[]
  getDailyCalorieDeficits: () => { date: string; deficit: number }[]
  getCumulativeCalorieDeficit: () => { date: string; deficit: number }[]
  setWeightUnit: (unit: "lbs" | "kg") => void
  convertWeight: (weight: number, from: "lbs" | "kg", to: "lbs" | "kg") => number
  resetApp: () => void
  backupData: () => string
  restoreData: (backupString: string) => boolean
}

const WeightTrackerContext = createContext<WeightTrackerContextType | undefined>(undefined)

// Storage keys
const ENTRIES_KEY = "weightTrackerEntries"
const GOAL_KEY = "weightTrackerGoal"
const WEIGHT_UNIT_KEY = "weightTrackerUnit"
const BACKUP_KEY = "weightTrackerBackup"
const LAST_UPDATED_KEY = "weightTrackerLastUpdated"

// Add weightUnit state and conversion functions to the provider
export function WeightTrackerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [weightUnit, setWeightUnit] = useState<string>("lbs")
  const [goal, setGoal] = useState<Goal | undefined>()
  const [isLoaded, setIsLoaded] = useState(false)

  // Create a backup of all data
  const createBackup = () => {
    const backup = {
      entries,
      goal,
      weightUnit,
      timestamp: new Date().toISOString()
    }
    return JSON.stringify(backup)
  }

  // Save backup to localStorage
  const saveBackup = () => {
    try {
      const backupData = createBackup()
      localStorage.setItem(BACKUP_KEY, backupData)
      localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString())
    } catch (error) {
      console.error("Error saving backup:", error)
    }
  }

  // Attempt to restore from backup if main storage fails
  const attemptRestore = () => {
    try {
      const backupData = localStorage.getItem(BACKUP_KEY)
      if (!backupData) return false

      const backup = JSON.parse(backupData)
      
      if (backup.entries) setEntries(backup.entries)
      if (backup.goal) setGoal(backup.goal)
      if (backup.weightUnit) setWeightUnit(backup.weightUnit)
      
      // Resave the data to main storage
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(backup.entries || []))
      if (backup.goal) localStorage.setItem(GOAL_KEY, JSON.stringify(backup.goal))
      if (backup.weightUnit) localStorage.setItem(WEIGHT_UNIT_KEY, backup.weightUnit)
      
      console.log("Data restored from backup")
      return true
    } catch (error) {
      console.error("Error restoring from backup:", error)
      return false
    }
  }

  // Load data from localStorage on component mount
  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem(ENTRIES_KEY)
      const savedGoal = localStorage.getItem(GOAL_KEY)
      const savedWeightUnit = localStorage.getItem(WEIGHT_UNIT_KEY)
      const lastUpdated = localStorage.getItem(LAST_UPDATED_KEY)

      let dataRestored = false
      
      // Check if main storage has data
      const hasMainData = savedEntries && savedEntries !== "[]"
      
      // If no main data but we have a backup, restore from backup
      if (!hasMainData) {
        dataRestored = attemptRestore()
      } else {
        // Load data from main storage
        if (savedEntries) {
          setEntries(JSON.parse(savedEntries))
        }

        if (savedGoal) {
          setGoal(JSON.parse(savedGoal))
        }

        if (savedWeightUnit) {
          setWeightUnit(savedWeightUnit)
        }
        
        // Create a backup after loading
        saveBackup()
      }
      
      setIsLoaded(true)
    } catch (error) {
      console.error("Error loading data:", error)
      // Try to restore from backup if main load fails
      const restored = attemptRestore()
      if (!restored) {
        // If restore fails, start with empty state
        setEntries([])
        setWeightUnit("lbs")
      }
      setIsLoaded(true)
    }
  }, [])

  // Save data to both main storage and backup whenever it changes
  useEffect(() => {
    if (!isLoaded) return
    
    try {
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
      // Create backup after saving
      saveBackup()
    } catch (error) {
      console.error("Error saving entries:", error)
    }
  }, [entries, isLoaded])

  useEffect(() => {
    if (!isLoaded) return
    
    try {
      if (goal) {
        localStorage.setItem(GOAL_KEY, JSON.stringify(goal))
        // Create backup after saving
        saveBackup()
      }
    } catch (error) {
      console.error("Error saving goal:", error)
    }
  }, [goal, isLoaded])

  useEffect(() => {
    if (!isLoaded) return
    
    try {
      localStorage.setItem(WEIGHT_UNIT_KEY, weightUnit)
      // Create backup after saving
      saveBackup()
    } catch (error) {
      console.error("Error saving weight unit:", error)
    }
  }, [weightUnit, isLoaded])

  // Function to manually backup all data (for export button)
  const backupData = (): string => {
    return createBackup()
  }

  // Function to manually restore from a backup string (for import button)
  const restoreData = (backupString: string): boolean => {
    try {
      const backup = JSON.parse(backupString)
      
      // Validate backup data structure
      if (!backup.entries || !Array.isArray(backup.entries)) {
        return false
      }
      
      // Set state
      setEntries(backup.entries || [])
      if (backup.goal) setGoal(backup.goal)
      if (backup.weightUnit) setWeightUnit(backup.weightUnit)
      
      // Save to storage
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(backup.entries || []))
      if (backup.goal) localStorage.setItem(GOAL_KEY, JSON.stringify(backup.goal))
      if (backup.weightUnit) localStorage.setItem(WEIGHT_UNIT_KEY, backup.weightUnit)
      
      // Create a backup
      saveBackup()
      
      return true
    } catch (error) {
      console.error("Error restoring data:", error)
      return false
    }
  }

  // Conversion function between lbs and kg
  const convertWeight = (weight: number, from: "lbs" | "kg", to: "lbs" | "kg"): number => {
    if (from === to) return weight
    if (from === "lbs" && to === "kg") return weight * 0.45359237
    return weight * 2.20462262 // kg to lbs
  }

  const addEntry = (entry: Entry) => {
    // Check if an entry for this date already exists
    const existingEntryIndex = entries.findIndex((e) => e.date === entry.date)

    if (existingEntryIndex >= 0) {
      // Update existing entry
      const updatedEntries = [...entries]
      updatedEntries[existingEntryIndex] = {
        ...updatedEntries[existingEntryIndex],
        ...entry,
      }
      setEntries(updatedEntries)
    } else {
      // Add new entry
      setEntries((prev) => [...prev, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    }
  }

  const updateEntry = (date: string, entryUpdate: Partial<Entry>) => {
    setEntries((prev) => prev.map((entry) => (entry.date === date ? { ...entry, ...entryUpdate } : entry)))
  }

  const deleteEntry = (date: string) => {
    setEntries(entries.filter(entry => entry.date !== date))
  }

  const getNetCalories = (entry: Entry) => {
    return entry.caloriesIn - entry.caloriesOut
  }

  // Calculate expected weight loss based on calorie deficit
  const getExpectedWeightLoss = () => {
    if (!goal || entries.length === 0) return []

    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const startDate = new Date(goal.startDate)
    let cumulativeDeficit = 0
    const expectedWeights: number[] = []

    // Assume 1 pound = 3500 calorie deficit
    const caloriesPerPound = 3500

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]
      const deficit = entry.caloriesOut - entry.caloriesIn
      cumulativeDeficit += deficit

      // Calculate expected weight based on calorie deficit
      const expectedWeightLoss = cumulativeDeficit / caloriesPerPound
      const expectedWeight = goal.startWeight - expectedWeightLoss

      expectedWeights.push(expectedWeight)
    }

    return expectedWeights
  }

  // Get actual weights from entries
  const getActualWeights = () => {
    return entries
      .filter((entry) => entry.weight !== undefined)
      .map((entry) => ({
        date: entry.date,
        weight: entry.weight as number,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Get daily calorie deficits
  const getDailyCalorieDeficits = () => {
    return entries
      .map((entry) => ({
        date: entry.date,
        deficit: entry.caloriesOut - entry.caloriesIn,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Get cumulative calorie deficit
  const getCumulativeCalorieDeficit = () => {
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let cumulativeDeficit = 0
    return sortedEntries.map((entry) => {
      const dailyDeficit = entry.caloriesOut - entry.caloriesIn
      cumulativeDeficit += dailyDeficit
      return {
        date: entry.date,
        deficit: cumulativeDeficit,
      }
    })
  }

  const resetApp = () => {
    setEntries([])
    setGoal(undefined)
    setWeightUnit("lbs")
    localStorage.removeItem(ENTRIES_KEY)
    localStorage.removeItem(GOAL_KEY)
    localStorage.removeItem(WEIGHT_UNIT_KEY)
    localStorage.removeItem(BACKUP_KEY)
    localStorage.removeItem(LAST_UPDATED_KEY)
  }

  return (
    <WeightTrackerContext.Provider
      value={{
        entries,
        addEntry,
        updateEntry,
        deleteEntry,
        getNetCalories,
        weightUnit,
        goal,
        setGoal,
        getExpectedWeightLoss,
        getActualWeights,
        getDailyCalorieDeficits,
        getCumulativeCalorieDeficit,
        setWeightUnit,
        convertWeight,
        resetApp,
        backupData,
        restoreData
      }}
    >
      {children}
    </WeightTrackerContext.Provider>
  )
}

export function useWeightTracker() {
  const context = useContext(WeightTrackerContext)
  if (context === undefined) {
    throw new Error("useWeightTracker must be used within a WeightTrackerProvider")
  }
  return context
}
