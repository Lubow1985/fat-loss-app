import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GoalSetting from "@/components/goal-setting"
import DailyEntry from "@/components/daily-entry"
import Dashboard from "@/components/dashboard"
import { WeightTrackerProvider } from "@/components/weight-tracker-context"
import { ResetButton } from "@/components/reset-button"
import { ExportButton } from "@/components/export-button"
import { ImportButton } from "@/components/import-button"

export default function Home() {
  return (
    <div className="min-h-screen gradient-bg py-8 px-4">
      <WeightTrackerProvider>
        <main className="container mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold mb-8 text-white text-center">Weight Loss Tracker</h1>

          <div className="glass-card rounded-xl shadow-xl p-6">
            <Tabs defaultValue="goals" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/20 p-1 rounded-lg">
                <TabsTrigger
                  value="goals"
                  className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md transition-all"
                >
                  Goals
                </TabsTrigger>
                <TabsTrigger
                  value="daily"
                  className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md transition-all"
                >
                  Daily Entry
                </TabsTrigger>
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md transition-all"
                >
                  Dashboard
                </TabsTrigger>
              </TabsList>

              <TabsContent value="goals">
                <GoalSetting />
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ExportButton />
                  <ImportButton />
                  <ResetButton />
                </div>
              </TabsContent>

              <TabsContent value="daily">
                <DailyEntry />
              </TabsContent>

              <TabsContent value="dashboard">
                <Dashboard />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </WeightTrackerProvider>
    </div>
  )
}
