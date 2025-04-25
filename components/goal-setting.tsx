"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWeightTracker } from "./weight-tracker-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Calculator } from "lucide-react"
import { format, addDays } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"

export default function GoalSetting() {
  const { goal, setGoal, weightUnit, setWeightUnit, convertWeight } = useWeightTracker()

  const [startWeight, setStartWeight] = useState(goal?.startWeight || 0)
  const [targetWeight, setTargetWeight] = useState(goal?.targetWeight || 0)
  const [startDate, setStartDate] = useState<Date | undefined>(goal?.startDate ? new Date(goal.startDate) : new Date())
  const [targetDate, setTargetDate] = useState<Date | undefined>(
    goal?.targetDate ? new Date(goal.targetDate) : undefined,
  )
  const [startingCalorieDeficit, setStartingCalorieDeficit] = useState(goal?.startingCalorieDeficit || 500)
  const [selectedUnit, setSelectedUnit] = useState<"lbs" | "kg">(weightUnit)
  const [autoCalculateDate, setAutoCalculateDate] = useState(true)

  // Handle unit change
  const handleUnitChange = (newUnit: "lbs" | "kg") => {
    if (newUnit !== selectedUnit) {
      setStartWeight(convertWeight(startWeight, selectedUnit, newUnit))
      setTargetWeight(convertWeight(targetWeight, selectedUnit, newUnit))
      setSelectedUnit(newUnit)
      setWeightUnit(newUnit)
    }
  }

  // Calculate target date based on weights and calorie deficit
  const calculateTargetDate = () => {
    if (!startWeight || !targetWeight || !startingCalorieDeficit || !startDate) return undefined

    // Ensure we're losing weight (startWeight > targetWeight)
    if (startWeight <= targetWeight) return undefined

    const weightToLose = startWeight - targetWeight

    // Convert weight to lbs for calculation if using kg
    const weightToLoseInLbs = selectedUnit === "kg" ? weightToLose * 2.20462262 : weightToLose

    // Calculate total calorie deficit needed (3500 calories = 1 lb)
    const totalCaloriesDeficit = weightToLoseInLbs * 3500

    // Calculate days needed
    const daysNeeded = Math.ceil(totalCaloriesDeficit / startingCalorieDeficit)

    // Calculate target date
    return addDays(startDate, daysNeeded)
  }

  // Update target date when weights or calorie deficit changes
  useEffect(() => {
    if (autoCalculateDate) {
      const calculatedDate = calculateTargetDate()
      if (calculatedDate) {
        setTargetDate(calculatedDate)
      }
    }
  }, [startWeight, targetWeight, startingCalorieDeficit, startDate, selectedUnit, autoCalculateDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !targetDate) {
      alert("Please select both start and target dates")
      return
    }

    setGoal({
      startWeight,
      targetWeight,
      startDate: startDate.toISOString().split("T")[0],
      targetDate: targetDate.toISOString().split("T")[0],
      startingCalorieDeficit,
      weightUnit: selectedUnit,
    })
  }

  const calculateTimeframe = () => {
    if (!startDate || !targetDate) return null

    const start = new Date(startDate)
    const end = new Date(targetDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  // Update the calculateRequiredDeficit function to handle kg conversion
  const calculateRequiredDeficit = () => {
    if (!startDate || !targetDate || !startWeight || !targetWeight) return null

    const weightToLose = startWeight - targetWeight
    const days = calculateTimeframe()

    if (!days) return null

    // Convert kg to lbs for calorie calculation if needed
    const weightToLoseInLbs = selectedUnit === "kg" ? weightToLose * 2.20462262 : weightToLose

    // 1 pound = 3500 calories
    const totalCaloriesDeficit = weightToLoseInLbs * 3500
    const dailyDeficit = totalCaloriesDeficit / days

    return Math.round(dailyDeficit)
  }

  return (
    <Card className="border-none shadow-lg bg-white/90">
      <CardHeader className="bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
        <CardTitle>Set Your Weight Loss Goals</CardTitle>
        <CardDescription className="text-white/90">Define your starting point, target, and timeframe</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label>Weight Unit</Label>
            <RadioGroup
              value={selectedUnit}
              onValueChange={(value) => handleUnitChange(value as "lbs" | "kg")}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lbs" id="lbs" />
                <Label htmlFor="lbs">Pounds (lbs)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kg" id="kg" />
                <Label htmlFor="kg">Kilograms (kg)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startWeight">Starting Weight ({selectedUnit})</Label>
              <Input
                id="startWeight"
                type="number"
                step="0.1"
                value={startWeight || ""}
                onChange={(e) => setStartWeight(Number.parseFloat(e.target.value) || 0)}
                required
                className="border-primary/20 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetWeight">Target Weight ({selectedUnit})</Label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                value={targetWeight || ""}
                onChange={(e) => setTargetWeight(Number.parseFloat(e.target.value) || 0)}
                required
                className="border-primary/20 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-primary/20",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Target Date</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-calculate"
                    checked={autoCalculateDate}
                    onCheckedChange={setAutoCalculateDate}
                    size="sm"
                  />
                  <Label htmlFor="auto-calculate" className="text-xs text-muted-foreground">
                    Auto-calculate
                  </Label>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-primary/20",
                      !targetDate && "text-muted-foreground",
                      autoCalculateDate && "bg-muted/50",
                    )}
                    disabled={autoCalculateDate}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, "PPP") : "Select date"}
                    {autoCalculateDate && <Calculator className="ml-auto h-4 w-4 text-muted-foreground" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={(date) => {
                      setTargetDate(date)
                      setAutoCalculateDate(false)
                    }}
                    initialFocus
                    disabled={(date) => (startDate ? date < startDate : false)}
                  />
                </PopoverContent>
              </Popover>
              {autoCalculateDate && targetDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-calculated based on weight and calorie deficit
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="calorieDeficit">Daily Calorie Deficit Goal</Label>
              <Input
                id="calorieDeficit"
                type="number"
                value={startingCalorieDeficit || ""}
                onChange={(e) => setStartingCalorieDeficit(Number.parseInt(e.target.value) || 0)}
                required
                className="border-primary/20 focus-visible:ring-primary"
              />
            </div>
          </div>

          {calculateTimeframe() && (
            <div className="bg-accent/10 p-4 rounded-md border border-accent/20">
              <p className="font-medium text-accent">Goal Summary:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  Weight to lose: {(startWeight - targetWeight).toFixed(1)} {selectedUnit}
                </li>
                <li>Timeframe: {calculateTimeframe()} days</li>
                <li>
                  {autoCalculateDate
                    ? `Daily calorie deficit: ${startingCalorieDeficit} calories`
                    : `Recommended daily calorie deficit: ${calculateRequiredDeficit()} calories`}
                </li>
              </ul>
            </div>
          )}

          <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            Save Goals
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
