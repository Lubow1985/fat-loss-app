"use client"

import { useWeightTracker } from "./weight-tracker-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { format, parseISO, differenceInDays, addDays, isValid } from "date-fns"
import { Chart, ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendItem } from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Legend,
  Cell,
  ComposedChart,
} from "recharts"
import { useMemo } from "react"

export default function Dashboard() {
  const { goal, entries, getActualWeights, getDailyCalorieDeficits, getCumulativeCalorieDeficit, weightUnit } =
    useWeightTracker()

  if (!goal) {
    return (
      <Alert className="bg-white/90 border-primary/20">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertTitle>No goals set</AlertTitle>
        <AlertDescription>Please set your weight loss goals in the Goals tab to see your progress.</AlertDescription>
      </Alert>
    )
  }

  if (entries.length === 0) {
    return (
      <Alert className="bg-white/90 border-secondary/20">
        <AlertCircle className="h-4 w-4 text-secondary" />
        <AlertTitle>No entries yet</AlertTitle>
        <AlertDescription>
          Add your daily entries in the Daily Entry tab to start tracking your progress.
        </AlertDescription>
      </Alert>
    )
  }

  // Helper function to generate dates between start and end
  const generateDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const dates = []
    let currentDate = new Date(start)

    while (currentDate <= end) {
      dates.push(format(currentDate, "yyyy-MM-dd"))
      currentDate = addDays(currentDate, 1)
    }

    return dates
  }

  // Get date range from goal start to goal end
  const dateRange = generateDateRange(goal.startDate, goal.targetDate)
  console.log('Date range:', dateRange)

  // 1. Progress vs Goal (Calories) - Cumulative calorie deficit
  const generateCalorieProgressData = () => {
    const dailyDeficits = getDailyCalorieDeficits();
    const dailyDeficitsMap = new Map();
    dailyDeficits.forEach(entry => {
      if (entry.deficit !== undefined && entry.deficit !== null) {
        dailyDeficitsMap.set(entry.date, entry.deficit);
      }
    });

    let expectedCumulative = 0;
    let actualCumulative = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    return dateRange.map((date) => {
      // Always add expected deficit for the target line
      expectedCumulative += goal.startingCalorieDeficit;

      // Only add actual deficit if we have data for this date and it's not in the future
      const currentDate = new Date(date);
      currentDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      
      if (dailyDeficitsMap.has(date) && currentDate <= today) {
        const deficit = dailyDeficitsMap.get(date);
        actualCumulative += deficit;
      }

      return {
        date: format(parseISO(date), "MMM d"),
        expected: expectedCumulative,
        // Only show actual value if not in the future
        actual: currentDate <= today ? actualCumulative : null
      };
    });
  }

  const calorieProgressData = generateCalorieProgressData()

  // 3. Daily Deficit vs Expected
  const generateDailyDeficitData = () => {
    const dailyDeficits = getDailyCalorieDeficits()
    const dailyDeficitsMap = new Map(dailyDeficits.map((item) => [item.date, item.deficit]))

    return dateRange.map((date) => {
      const actual = dailyDeficitsMap.get(date) || 0

      return {
        date: format(parseISO(date), "MMM d"),
        expected: goal.startingCalorieDeficit,
        actual: actual
      }
    })
  }

  const dailyDeficitData = generateDailyDeficitData()

  // 2. Progress vs Goal (Weight)
  const generateWeightProgressData = () => {
    // Get actual weight measurements
    const actualWeights = getActualWeights()
    console.log('Raw actual weights:', actualWeights)
    const actualWeightsMap = new Map(actualWeights.map((item) => [item.date, item.weight]))

    // Calculate expected weight loss from cumulative calorie deficit
    let cumulativeDeficitLbs = 0
    const caloriesPerPound = 3500
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison

    // Add starting weight as first data point
    const startDate = dateRange[0]
    actualWeightsMap.set(startDate, goal.startWeight)

    const data = dateRange.map((date) => {
      const currentDate = new Date(date)
      currentDate.setHours(0, 0, 0, 0)

      // Calculate cumulative deficit up to this date, but only if not in future
      const dayIndex = dateRange.indexOf(date)
      if (dayIndex > 0 && currentDate <= today) {
        const dailyDeficit = dailyDeficitData[dayIndex].actual
        cumulativeDeficitLbs += dailyDeficit / caloriesPerPound
      }

      // Convert deficit to weight loss in user's unit
      const expectedLossInUserUnit = weightUnit === "kg" 
        ? cumulativeDeficitLbs * 0.45359237  // Convert pounds to kg
        : cumulativeDeficitLbs

      // Get actual weight for this date and calculate loss from starting weight
      const actualWeight = actualWeightsMap.get(date)
      const actualLoss = actualWeight !== undefined 
        ? goal.startWeight - actualWeight 
        : null

      const dataPoint = {
        date: format(parseISO(date), "MMM d"),
        // Only show expected loss up to today
        expected: currentDate <= today ? Number(expectedLossInUserUnit.toFixed(2)) || 0 : null,
        actual: actualLoss !== null ? Number(actualLoss.toFixed(2)) || 0 : null
      }
      console.log(`Data point for ${date}:`, dataPoint)
      return dataPoint
    })

    console.log('Final weight progress data:', data)
    return data
  }

  const weightProgressData = generateWeightProgressData()

  // 4. Adherence Counter
  const calculateAdherence = () => {
    const dailyDeficits = getDailyCalorieDeficits()
    const daysAdherent = dailyDeficits.filter((day) => day.deficit >= goal.startingCalorieDeficit).length
    const daysFailed = dailyDeficits.length - daysAdherent
    const adherenceRate = dailyDeficits.length > 0 ? (daysAdherent / dailyDeficits.length) * 100 : 0

    return {
      daysAdherent,
      daysFailed,
      adherenceRate: Math.round(adherenceRate),
    }
  }

  const adherenceStats = calculateAdherence()

  // 5. Actual Weight vs Expected Weight
  const generateWeightComparisonData = () => {
    try {
      // Validate required values
      if (!goal || !goal.startWeight || !goal.targetWeight || !goal.startDate || !goal.targetDate) {
        console.error('Missing required goal data:', goal)
        return []
      }

      const actualWeights = getActualWeights()
      console.log('Actual weights:', actualWeights)
      const actualWeightsMap = new Map(actualWeights.map((item) => [item.date, item.weight]))

      // Calculate total days and daily weight change
      const startDate = parseISO(goal.startDate)
      const endDate = parseISO(goal.targetDate)
      const totalDays = differenceInDays(endDate, startDate)
      
      if (totalDays <= 0) {
        console.error('Invalid date range:', { startDate, endDate, totalDays })
        return []
      }

      const totalWeightToLose = goal.startWeight - goal.targetWeight
      const dailyWeightLoss = totalWeightToLose / totalDays

      console.log('Calculation parameters:', {
        startWeight: goal.startWeight,
        targetWeight: goal.targetWeight,
        totalDays,
        dailyWeightLoss
      })

      return dateRange.map((date) => {
        try {
          const currentDate = parseISO(date)
          const daysFromStart = differenceInDays(currentDate, startDate)
          
          // Calculate expected weight
          let expectedWeight = goal.startWeight
          if (daysFromStart >= 0) {
            expectedWeight = goal.startWeight - (dailyWeightLoss * daysFromStart)
          }

          // Get actual weight
          let actualWeight = actualWeightsMap.get(date)
          if (date === goal.startDate) {
            actualWeight = goal.startWeight
          }

          const dataPoint = {
            date: format(currentDate, "MMM d"),
            expected: expectedWeight,
            actual: actualWeight || null
          }

          console.log('Data point:', {
            date,
            daysFromStart,
            expectedWeight,
            actualWeight,
            dataPoint
          })

          return dataPoint
        } catch (err) {
          console.error('Error processing date:', date, err)
          return {
            date: date,
            expected: null,
            actual: null
          }
        }
      }).filter(point => point !== null)
    } catch (err) {
      console.error('Error generating weight comparison data:', err)
      return []
    }
  }

  const weightComparisonData = generateWeightComparisonData()

  // 6. Daily Deficit/Surplus Bar Chart
  const generateDailyNetData = () => {
    try {
      const dailyDeficits = getDailyCalorieDeficits()
      const dailyDeficitsMap = new Map(dailyDeficits.map((item) => [item.date, item.deficit]))

      // Only show data up to today and from the first entry
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const firstEntryDate = dailyDeficits.length > 0 ? parseISO(dailyDeficits[0].date) : null

      return dateRange
        .map((date) => {
          const currentDate = parseISO(date)
          if (currentDate > today || (firstEntryDate && currentDate < firstEntryDate)) {
            return null
          }

          const deficit = dailyDeficitsMap.get(date)
          if (deficit === undefined) {
            return null
          }

          // Convert deficit to negative (below x-axis) and surplus to positive (above x-axis)
          const netCalories = deficit >= 0 ? -deficit : -deficit

          return {
            date: format(currentDate, "MMM d"),
            netCalories: netCalories
          }
        })
        .filter(point => point !== null)
    } catch (err) {
      console.error('Error generating daily net data:', err)
      return []
    }
  }

  const dailyNetData = generateDailyNetData()

  // 7. Goal Progress
  const calculateGoalProgress = () => {
    // Weight loss progress
    const actualWeights = getActualWeights()
    let weightLossProgress = 0

    if (actualWeights.length > 0) {
      const latestWeight = actualWeights[actualWeights.length - 1].weight
      const totalWeightToLose = goal.startWeight - goal.targetWeight
      const weightLost = goal.startWeight - latestWeight
      weightLossProgress = (weightLost / totalWeightToLose) * 100
    }

    // Calorie deficit progress
    const totalDeficitNeeded = (goal.startWeight - goal.targetWeight) * (weightUnit === "kg" ? 7700 : 3500) // Calories per kg or lb

    const cumulativeDeficits = getCumulativeCalorieDeficit()
    const currentDeficit = cumulativeDeficits.length > 0 ? cumulativeDeficits[cumulativeDeficits.length - 1].deficit : 0

    const calorieProgress = (currentDeficit / totalDeficitNeeded) * 100

    // Time elapsed progress
    const startDate = new Date(goal.startDate)
    const endDate = new Date(goal.targetDate)
    const today = new Date()

    const totalDays = differenceInDays(endDate, startDate)
    const daysPassed = differenceInDays(today, startDate)
    const timeProgress = (daysPassed / totalDays) * 100

    return {
      weightLossProgress: Math.min(100, Math.max(0, weightLossProgress)),
      calorieProgress: Math.min(100, Math.max(0, calorieProgress)),
      timeProgress: Math.min(100, Math.max(0, timeProgress)),
    }
  }

  const goalProgress = calculateGoalProgress()

  // Calculate 7-day rolling average for deficits
  const generateDeficitData = () => {
    if (!goal) return []

    const dailyDeficits = getDailyCalorieDeficits()
    const sortedDeficits = [...dailyDeficits].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return sortedDeficits.map((entry, index) => {
      // Calculate 7-day rolling average (only if we have 7 days of data)
      let rollingAverage = null
      if (index >= 6) {
        const last7Days = sortedDeficits.slice(index - 6, index + 1)
        rollingAverage = last7Days.reduce((sum, e) => sum + e.deficit, 0) / 7
      }

      // Calculate all-time average up to this point
      const daysElapsed = differenceInDays(new Date(entry.date), new Date(goal.startDate)) + 1
      const totalDeficit = sortedDeficits
        .slice(0, index + 1)
        .reduce((sum, e) => sum + e.deficit, 0)
      const allTimeAverage = totalDeficit / daysElapsed

      return {
        date: entry.date,
        deficit: -entry.deficit, // Negate so deficits are negative
        rollingAverage: rollingAverage !== null ? -rollingAverage : null,
        allTimeAverage: -allTimeAverage,
        targetDeficit: -goal.startingCalorieDeficit
      }
    })
  }

  const deficitData = useMemo(() => generateDeficitData(), [entries, goal])

  return (
    <div className="space-y-8">
      {/* 7. Goal Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg bg-white/90">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
            <CardTitle className="text-sm font-medium">Weight Loss Progress</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold gradient-text">{goalProgress.weightLossProgress.toFixed(1)}%</div>
            <div className="mt-2 h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                style={{ width: `${goalProgress.weightLossProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/90">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
            <CardTitle className="text-sm font-medium">Calorie Deficit Progress</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold gradient-text">{goalProgress.calorieProgress.toFixed(1)}%</div>
            <div className="mt-2 h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-secondary to-accent rounded-full"
                style={{ width: `${goalProgress.calorieProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/90">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
            <CardTitle className="text-sm font-medium">Time Elapsed</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold gradient-text">{goalProgress.timeProgress.toFixed(1)}%</div>
            <div className="mt-2 h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
                style={{ width: `${goalProgress.timeProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Adherence Counter */}
      <Card className="border-none shadow-lg bg-white/90">
        <CardHeader className="bg-gradient-to-r from-primary to-accent text-white rounded-t-lg">
          <CardTitle>Adherence to Calorie Goals</CardTitle>
          <CardDescription className="text-white/90">
            How well you're sticking to your daily calorie deficit goal
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-success mb-2" />
              <div className="text-2xl font-bold text-success">{adherenceStats.daysAdherent}</div>
              <div className="text-sm text-muted-foreground">Days On Target</div>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg">
              <XCircle className="h-8 w-8 text-destructive mb-2" />
              <div className="text-2xl font-bold text-destructive">{adherenceStats.daysFailed}</div>
              <div className="text-sm text-muted-foreground">Days Below Target</div>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold gradient-text">{adherenceStats.adherenceRate}%</div>
              <div className="text-sm text-muted-foreground">Adherence Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Calorie Deficit Progress */}
      <Card className="border-none shadow-lg bg-white/90">
        <CardHeader className="bg-gradient-to-r from-primary to-secondary text-white rounded-t-lg">
          <CardTitle>Cumulative Calorie Deficit Progress</CardTitle>
          <CardDescription className="text-white/90">Expected vs. actual calorie deficit over time</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[550px] w-full bg-white/50 rounded-lg p-4">
            <ResponsiveContainer>
              <LineChart 
                data={calorieProgressData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  height={50}
                />
                <YAxis 
                  domain={[(dataMin: number) => {
                    // Find the minimum value in the actual data
                    const minActual = Math.min(...calorieProgressData
                      .map(item => item.actual)
                      .filter((val): val is number => val !== null));
                    // Return 0 if all values are positive, otherwise return the minimum value
                    return Math.min(0, minActual);
                  }, (dataMax: number) => {
                    // Get the maximum value between actual and expected
                    const maxActual = Math.max(...calorieProgressData
                      .map(item => item.actual)
                      .filter((val): val is number => val !== null));
                    const maxExpected = Math.max(...calorieProgressData.map(item => item.expected));
                    const absoluteMax = Math.max(maxActual, maxExpected);
                    // Use intervals of 10000 for nice round numbers
                    return Math.ceil(absoluteMax / 10000) * 10000;
                  }]}
                  ticks={[0, 10000, 20000, 30000, 40000, 50000]}
                  tickFormatter={(value) => {
                    return Math.round(value / 1000).toLocaleString() + 'k';
                  }}
                  width={80}
                />
                <Tooltip 
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return value.toFixed(1);
                    }
                    return value;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="expected"
                  name="Expected Deficit"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Deficit"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={true}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weight Loss from Calorie Deficit */}
      <Card className="border-none shadow-lg bg-white/90">
        <CardHeader className="bg-gradient-to-r from-secondary to-accent text-white rounded-t-lg">
          <CardTitle>Weight Loss from Calorie Deficit</CardTitle>
          <CardDescription className="text-white/90">
            Expected vs. actual weight loss based on calorie deficit (3,500 calories = 1 lb)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[550px] w-full bg-white/50 rounded-lg p-4">
            <ResponsiveContainer>
              <LineChart 
                data={weightProgressData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  height={50}
                />
                <YAxis 
                  label={{ value: `Weight Loss (${weightUnit})`, angle: -90, position: "insideLeft" }}
                  domain={[0, (dataMax: number) => {
                    // Get the maximum value between actual and expected
                    const maxExpected = Math.max(...weightProgressData
                      .map(item => item.expected)
                      .filter((val): val is number => val !== null));
                    const maxActual = Math.max(...weightProgressData
                      .map(item => item.actual)
                      .filter((val): val is number => val !== null));
                    const absoluteMax = Math.max(maxExpected, maxActual);
                    // Round up to nearest whole number and add 1 for small padding
                    const roundedMax = Math.ceil(absoluteMax) + 1;
                    return roundedMax;
                  }]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tickFormatter={(value) => Math.round(value).toString()}
                  width={80}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="expected"
                  name={`Expected Loss (${weightUnit})`}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name={`Actual Loss (${weightUnit})`}
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={true}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 5. Actual Weight vs Expected Weight */}
      <Card className="border-none shadow-lg bg-white/90">
        <CardHeader className="bg-gradient-to-r from-accent to-primary text-white rounded-t-lg">
          <CardTitle>Actual vs Expected Weight</CardTitle>
          <CardDescription className="text-white/90">
            Your recorded weight compared to expected weight based on calorie deficit
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[550px] w-full bg-white/50 rounded-lg p-4">
            <ResponsiveContainer>
              <LineChart 
                data={weightComparisonData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  height={50}
                />
                <YAxis 
                  label={{ value: `Weight (${weightUnit})`, angle: -90, position: "insideLeft" }}
                  domain={[(dataMin: number) => {
                    // Find the minimum value in the actual data
                    const minActual = Math.min(...weightComparisonData
                      .map(item => item.actual)
                      .filter((val): val is number => val !== null));
                    const minExpected = Math.min(...weightComparisonData
                      .map(item => item.expected)
                      .filter((val): val is number => val !== null));
                    // Return the lower of the two, rounded down
                    return Math.floor(Math.min(minActual, minExpected));
                  }, (dataMax: number) => {
                    // Get the maximum value between actual and expected
                    const maxActual = Math.max(...weightComparisonData
                      .map(item => item.actual)
                      .filter((val): val is number => val !== null));
                    const maxExpected = Math.max(...weightComparisonData
                      .map(item => item.expected)
                      .filter((val): val is number => val !== null));
                    const absoluteMax = Math.max(maxActual, maxExpected);
                    // Round up to nearest whole number and add 1 for padding
                    return Math.ceil(absoluteMax) + 1;
                  }]}
                  tickFormatter={(value) => Math.round(value).toString()}
                  width={80}
                />
                <Tooltip 
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return value.toFixed(1);
                    }
                    return value;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="expected"
                  name="Expected Weight (lbs)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Weight (lbs)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={true}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 6. Daily Deficit/Surplus Bar Chart */}
      <Card className="border-none shadow-lg bg-white/90">
        <CardHeader className="bg-gradient-to-r from-primary to-accent text-white rounded-t-lg">
          <CardTitle>Daily Deficit/Surplus Bar Chart</CardTitle>
          <CardDescription className="text-white/90">
            Daily calorie deficit (green, below axis) or surplus (red, above axis)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[550px] w-full bg-white/50 rounded-lg p-4">
            <ResponsiveContainer>
              <BarChart
                data={dailyNetData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  height={50}
                />
                <YAxis
                  label={{ value: "Calories", angle: -90, position: "insideLeft" }}
                  domain={[(dataMin: number) => {
                    const minValue = Math.min(...dailyNetData.map(item => item.netCalories))
                    // Round down to nearest 500 for nice grid lines
                    return Math.floor(minValue / 500) * 500
                  }, (dataMax: number) => {
                    const maxValue = Math.max(...dailyNetData.map(item => item.netCalories))
                    // Round up to nearest 500 for nice grid lines
                    return Math.max(500, Math.ceil(maxValue / 500) * 500)
                  }]}
                  tickFormatter={(value) => Math.abs(value).toString()}
                />
                <Tooltip
                  formatter={(value: number) => {
                    const absValue = Math.abs(value)
                    return [`${absValue} calories`, value < 0 ? 'Deficit' : 'Surplus']
                  }}
                />
                <ReferenceLine y={0} stroke="#666" />
                <Bar
                  dataKey="netCalories"
                  name="Calories"
                  radius={[4, 4, 0, 0]}
                  fill="#22c55e"
                  stroke="none"
                >
                  {dailyNetData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.netCalories < 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg bg-white/90">
        <CardHeader className="bg-gradient-to-r from-secondary to-accent text-white rounded-t-lg">
          <CardTitle>Calorie Deficit Tracking</CardTitle>
          <CardDescription className="text-white/90">
            Daily deficits vs target with rolling and all-time averages
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deficitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "MMM d")}
                />
                <YAxis
                  domain={[
                    (dataMin: number) => {
                      const minValue = Math.min(dataMin, goal?.startingCalorieDeficit || 0);
                      // Round down to nearest 500 for nice grid lines
                      return Math.floor(minValue / 500) * 500;
                    },
                    (dataMax: number) => {
                      const maxValue = Math.max(dataMax, 0);
                      // Round up to nearest 500 for nice grid lines
                      return Math.ceil(maxValue / 500) * 500;
                    }
                  ]}
                  tickFormatter={(value: number) => {
                    // Format numbers with commas for thousands
                    return Math.abs(value).toLocaleString();
                  }}
                  width={80}
                  label={{ value: "Calories", angle: -90, position: "insideLeft" }}
                />
                <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dailyValue = Number(payload[0]?.value) || 0;
                      const rollingValue = Number(payload[1]?.value);
                      const avgValue = Number(payload[2]?.value) || 0;
                      const targetValue = Number(payload[3]?.value) || 0;

                      return (
                        <div className="bg-white p-4 border rounded-lg shadow-lg">
                          <p className="font-semibold">{format(new Date(label), "MMM d, yyyy")}</p>
                          <p className="text-sm text-gray-600">
                            Daily: {Math.abs(Math.round(dailyValue)).toLocaleString()} calorie {dailyValue > 0 ? 'surplus' : 'deficit'}
                          </p>
                          {!isNaN(rollingValue) && (
                            <p className="text-sm text-blue-600">
                              7-Day Average: {Math.abs(Math.round(rollingValue)).toLocaleString()} calorie {rollingValue > 0 ? 'surplus' : 'deficit'}
                            </p>
                          )}
                          <p className="text-sm text-purple-600">
                            All-time Average: {Math.abs(Math.round(avgValue)).toLocaleString()} calorie {avgValue > 0 ? 'surplus' : 'deficit'}
                          </p>
                          <p className="text-sm text-red-600">
                            Target: {Math.abs(Math.round(targetValue)).toLocaleString()} calorie deficit
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="deficit"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={true}
                  name="Daily Deficit/Surplus"
                />
                <Line
                  type="monotone"
                  dataKey="rollingAverage"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  name="7-Day Average"
                  connectNulls={true}
                />
                <Line
                  type="monotone"
                  dataKey="allTimeAverage"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={false}
                  name="All-time Average"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  y={-goal?.startingCalorieDeficit}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{
                    value: `Target (${goal?.startingCalorieDeficit} cal deficit)`,
                    position: 'right',
                    fill: '#ef4444'
                  }}
                />
                <Legend 
                  formatter={(value, entry) => {
                    const color = value === 'Target' ? '#ef4444' : entry.color;
                    return <span style={{ color }}>{value}</span>;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}