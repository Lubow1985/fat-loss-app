"use client"

import { Button } from "@/components/ui/button"
import { useWeightTracker } from "@/components/weight-tracker-context"
import { Download } from "lucide-react"

export function ExportButton() {
  const { entries, goal, weightUnit } = useWeightTracker()

  const handleExport = () => {
    // Create CSV header row
    const headers = ['Date', 'Calories In', 'Calories Out', 'Net Calories', 'Weight'];
    
    // Format entries as CSV rows
    const rows = entries.map(entry => {
      const netCalories = entry.caloriesIn - entry.caloriesOut;
      return [
        entry.date,
        entry.caloriesIn,
        entry.caloriesOut,
        netCalories,
        entry.weight || ''
      ].join(',');
    });
    
    // Add goal information as metadata at the top
    const goalInfo = [
      `# Weight Loss Tracker Export - ${new Date().toLocaleDateString()}`,
      `# Weight Unit: ${weightUnit}`,
    ];
    
    if (goal) {
      goalInfo.push(
        `# Start Weight: ${goal.startWeight} ${weightUnit}`,
        `# Target Weight: ${goal.targetWeight} ${weightUnit}`,
        `# Start Date: ${goal.startDate}`,
        `# Target Date: ${goal.targetDate}`,
        `# Daily Calorie Deficit Goal: ${goal.startingCalorieDeficit} calories`
      );
    }
    
    // Combine everything into CSV content
    const csvContent = [
      ...goalInfo,
      headers.join(','),
      ...rows
    ].join('\n');
    
    // Create a blob with the data
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement("a");
    link.href = url;
    
    // Set the download filename with current date
    const date = new Date().toISOString().split("T")[0];
    link.download = `fat-loss-data-${date}.csv`;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Release the URL object
    URL.revokeObjectURL(url);
  }

  return (
    <Button 
      onClick={handleExport} 
      className="w-full flex items-center gap-2"
      variant="outline"
    >
      <Download size={16} />
      Export to CSV
    </Button>
  )
} 