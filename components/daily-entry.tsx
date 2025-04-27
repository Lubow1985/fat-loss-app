"use client"

import type React from "react"

import { useState } from "react"
import { useWeightTracker } from "./weight-tracker-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import { format, addDays, subDays } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function DailyEntry() {
  const { entries, addEntry, updateEntry, getNetCalories, weightUnit, goal, deleteEntry } = useWeightTracker()
  const targetDeficit = goal?.startingCalorieDeficit ?? 500

  const [date, setDate] = useState<Date | undefined>(subDays(new Date(), 1))
  const [caloriesIn, setCaloriesIn] = useState<number>(0)
  const [caloriesOut, setCaloriesOut] = useState<number>(0)
  const [weight, setWeight] = useState<number | undefined>(undefined)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!date) {
      alert("Please select a date")
      return
    }

    // Format date in local timezone
    const formattedDate = format(date, 'yyyy-MM-dd')

    const newEntry = {
      date: formattedDate,
      caloriesIn,
      caloriesOut,
      weight: weight || undefined,
    }

    console.log('Adding new entry:', newEntry)
    console.log('Current entries:', entries)

    addEntry(newEntry)

    // Reset form and advance date by one day
    setCaloriesIn(0)
    setCaloriesOut(0)
    setWeight(undefined)
    setDate(addDays(date, 1))

    // Log entries after addition
    console.log('Entries after addition:', entries)
  }

  const handleDelete = (entryDate: string) => {
    deleteEntry(entryDate)
  }

  // Sort entries by date (newest first)
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-8">
      <Card className="border-none shadow-lg bg-white/90">
        <CardHeader className="bg-gradient-to-r from-secondary to-accent text-white rounded-t-lg">
          <CardTitle>Add Daily Entry</CardTitle>
          <CardDescription className="text-white/90">Track your daily calories and weight</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-secondary/20",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight ({weightUnit}) (Optional)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={weight === undefined ? "" : weight}
                  onChange={(e) => setWeight(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                  placeholder="Optional"
                  className="border-secondary/20 focus-visible:ring-secondary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caloriesIn">Calories In</Label>
                <Input
                  id="caloriesIn"
                  type="number"
                  value={caloriesIn || ""}
                  onChange={(e) => setCaloriesIn(Number.parseInt(e.target.value) || 0)}
                  required
                  className="border-secondary/20 focus-visible:ring-secondary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caloriesOut">Calories Out</Label>
                <Input
                  id="caloriesOut"
                  type="number"
                  value={caloriesOut || ""}
                  onChange={(e) => setCaloriesOut(Number.parseInt(e.target.value) || 0)}
                  required
                  className="border-secondary/20 focus-visible:ring-secondary"
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg bg-white/90">
        <CardHeader className="bg-gradient-to-r from-secondary to-accent text-white rounded-t-lg">
          <CardTitle>Recent Entries</CardTitle>
          <CardDescription className="text-white/90">Your logged data for the past days</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {sortedEntries.length > 0 ? (
            <div className="rounded-lg overflow-hidden border border-secondary/10">
              <Table>
                <TableHeader className="bg-secondary/5">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Calories In</TableHead>
                    <TableHead>Calories Out</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => (
                    <TableRow key={entry.date} className="hover:bg-secondary/5">
                      <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{entry.caloriesIn}</TableCell>
                      <TableCell>{entry.caloriesOut}</TableCell>
                      <TableCell>
                        {getNetCalories(entry) <= 0 ? (
                          <Badge
                            variant={getNetCalories(entry) <= -targetDeficit ? "secondary" : "outline"}
                            className={cn(
                              getNetCalories(entry) <= -targetDeficit 
                                ? "bg-green-500 hover:bg-green-600" 
                                : "bg-transparent text-foreground hover:bg-transparent",
                              getNetCalories(entry) <= -targetDeficit ? "text-white" : ""
                            )}
                          >
                            {getNetCalories(entry)}
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="bg-destructive text-white"
                          >
                            {getNetCalories(entry)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{entry.weight ? `${entry.weight} ${weightUnit}` : "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.date)}>
                          <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">No entries yet. Add your first entry above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
