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
}

const WeightTrackerContext = createContext<WeightTrackerContextType | undefined>(undefined)

// Add weightUnit state and conversion functions to the provider
export function WeightTrackerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [weightUnit, setWeightUnit] = useState<string>("lbs")
  const [goal, setGoal] = useState<Goal | undefined>()

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedEntries = localStorage.getItem("weightTrackerEntries")
    const savedGoal = localStorage.getItem("weightTrackerGoal")
    const savedWeightUnit = localStorage.getItem("weightTrackerUnit")

    if (savedEntries) {
      setEntries(JSON.parse(savedEntries))
    }

    if (savedGoal) {
      setGoal(JSON.parse(savedGoal))
    }

    if (savedWeightUnit) {
      setWeightUnit(savedWeightUnit)
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("weightTrackerEntries", JSON.stringify(entries))
  }, [entries])

  useEffect(() => {
    if (goal) {
      localStorage.setItem("weightTrackerGoal", JSON.stringify(goal))
    }
  }, [goal])

  useEffect(() => {
    localStorage.setItem("weightTrackerUnit", weightUnit)
  }, [weightUnit])

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
    localStorage.removeItem("weightTrackerEntries")
    localStorage.removeItem("weightTrackerGoal")
    localStorage.removeItem("weightTrackerUnit")
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
